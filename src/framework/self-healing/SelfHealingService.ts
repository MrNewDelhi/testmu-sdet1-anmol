import type { Locator, Page } from '@playwright/test';
import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { XaiClient, type SelectorRepairResponse } from '../../ai/XaiClient.js';
import { captureInteractiveDom } from '../../agents/self-healing/DomSnapshot.js';
import { CONFIDENCE_THRESHOLD, scoreConfidence } from './confidence.js';
import { LocatorCache, type CacheEntry, type StoredLocator } from './LocatorCache.js';
import { contractMatches, describeContract, type TargetContract } from './contract.js';
import { DeterministicLocator } from './DeterministicLocator.js';

const logDirectory = resolve(process.cwd(), 'src/agents/self-healing');
const logFile = resolve(logDirectory, 'heal-log.v2.jsonl');

export interface HealEvent extends SelectorRepairResponse {
  brokenSelector: string;
  intent: string;
  /**
   * How the selector was produced:
   * - 'deterministic' rebuilt it locally (no LLM, zero tokens),
   * - 'xai' asked the model,
   * - 'cache' reused a stored repair.
   */
  source: 'xai' | 'cache' | 'deterministic';
  version: 'v2-centralized' | 'v4-contract' | 'v5-deterministic' | 'v6-multi-locator';
  /** Which attribute produced the used locator (id, data-testid, form+type, ...). */
  locatorStrategy: string;
  /** Our programmatic score; distinct from the model's self-reported confidence. */
  computedConfidence: number;
  matchCount: number;
  /** True when a target contract was enforced on the healed element. */
  contractValidated: boolean;
  timestamp: string;
}

export class SelfHealingService {
  readonly events: HealEvent[] = [];

  constructor(
    private readonly page: Page,
    private readonly xai = new XaiClient(),
    private readonly cache = new LocatorCache(),
    private readonly deterministic = new DeterministicLocator(),
  ) {}

  /**
   * @param contract Optional structured description of the intended element.
   *   When provided, the healed element must satisfy it (role/type/ancestor/
   *   text) or the heal is refused.
   */
  async locator(selector: string, intent: string, contract?: TargetContract): Promise<Locator> {
    const original = this.page.locator(selector);
    if (await original.count() > 0) {
      return original.first();
    }

    const pageKey = LocatorCache.pageKey(this.page.url());

    // Fast path: reuse a previously healed entry without any LLM/DOM work.
    const cached = this.cache.get(pageKey, selector, intent);
    if (cached) {
      const fromCache = await this.tryCache(cached, selector, intent, contract);
      if (fromCache) return fromCache;
      // No stored locator still resolves (page drifted) -> fall through to re-heal.
    }

    // Deterministic-first: rebuild the locator locally before spending tokens,
    // and capture several attribute-diverse locators so the cache is resilient.
    const localCandidates = await this.deterministic.candidates(this.page, intent, contract);
    if (localCandidates.length > 0) {
      const primary = localCandidates[0];
      const primaryLocator = this.page.locator(primary.selector);
      const target = await this.resolveAgainstContract(primaryLocator, contract);
      if (target) {
        const matchCount = await primaryLocator.count();
        const score = scoreConfidence(primary.selector, 1, matchCount);
        const reason = `deterministic: unique ${primary.strategy} match, no LLM call`;
        await this.store(pageKey, selector, intent, {
          selector: primary.selector,
          confidence: 1,
          reason,
          locators: localCandidates,
          source: 'deterministic',
          contract,
          computedConfidence: score.computedConfidence,
          matchCount,
        });
        this.record(this.event({
          selector: primary.selector,
          confidence: 1,
          reason,
          brokenSelector: selector,
          intent,
          source: 'deterministic',
          version: 'v5-deterministic',
          locatorStrategy: primary.strategy,
          matchCount,
          computedConfidence: score.computedConfidence,
          contract,
        }));
        return target;
      }
    }

    // Slow path: ask xAI. The contract description is appended to the intent to
    // improve the model's recall of the right element.
    const domSnapshot = await captureInteractiveDom(this.page);
    const enrichedIntent = contract ? `${intent} ${describeContract(contract)}`.trim() : intent;
    const repaired = await this.xai.repairSelector({
      brokenSelector: selector,
      intent: enrichedIntent,
      domSnapshot,
      url: this.page.url(),
    });

    const healed = this.page.locator(repaired.selector);
    const matchCount = await healed.count();
    if (matchCount === 0) {
      throw new Error(`xAI suggested selector "${repaired.selector}", but it matched no elements.`);
    }

    const score = scoreConfidence(repaired.selector, repaired.confidence, matchCount);
    if (score.computedConfidence < CONFIDENCE_THRESHOLD) {
      throw new Error(
        `Refusing to heal "${selector}": computed confidence ${score.computedConfidence} ` +
          `(model=${score.modelConfidence}, matches=${matchCount}) is below ${CONFIDENCE_THRESHOLD}.`,
      );
    }

    const target = await this.resolveAgainstContract(healed, contract);
    if (!target) {
      throw new Error(
        `Refusing to heal "${selector}": xAI suggested "${repaired.selector}", but no single element ` +
          `matched the target contract ${JSON.stringify(contract)}.`,
      );
    }

    // Enrich the xAI answer with attribute-diverse fallbacks for the same element.
    const alternates = await this.deterministic.locatorsFor(this.page, repaired.selector);
    const locators = this.dedupe([{ selector: repaired.selector, strategy: 'xai' }, ...alternates]);

    await this.store(pageKey, selector, intent, {
      selector: repaired.selector,
      confidence: score.modelConfidence,
      reason: repaired.reason,
      locators,
      source: 'xai',
      contract,
      computedConfidence: score.computedConfidence,
      matchCount,
    });
    this.record(this.event({
      selector: repaired.selector,
      confidence: repaired.confidence,
      reason: repaired.reason,
      brokenSelector: selector,
      intent,
      source: 'xai',
      version: contract ? 'v4-contract' : 'v2-centralized',
      locatorStrategy: 'xai',
      matchCount,
      computedConfidence: score.computedConfidence,
      contract,
    }));

    return target;
  }

  /**
   * Serve from cache by trying each stored locator in rank order. If the
   * primary drifted but a fallback (e.g. data-testid) still resolves, the heal
   * succeeds without an LLM call — tagged v6-multi-locator.
   */
  private async tryCache(
    cached: CacheEntry,
    selector: string,
    intent: string,
    contract?: TargetContract,
  ): Promise<Locator | null> {
    const stored = this.parseLocators(cached);
    for (let i = 0; i < stored.length; i += 1) {
      const candidate = stored[i];
      const target = await this.resolveAgainstContract(this.page.locator(candidate.selector), contract);
      if (target) {
        this.cache.recordHit(cached.id);
        this.record(this.event({
          selector: candidate.selector,
          confidence: cached.model_confidence,
          reason: i > 0
            ? `cache fallback: primary drifted, healed via ${candidate.strategy}`
            : cached.reason,
          brokenSelector: selector,
          intent,
          source: 'cache',
          version: i > 0 ? 'v6-multi-locator' : (contract ? 'v4-contract' : 'v2-centralized'),
          locatorStrategy: candidate.strategy,
          matchCount: cached.match_count,
          computedConfidence: cached.computed_confidence,
          contract,
        }));
        return target;
      }
    }
    return null;
  }

  private parseLocators(cached: CacheEntry): StoredLocator[] {
    try {
      const parsed = JSON.parse(cached.locators) as StoredLocator[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // Fall back to the single primary selector below.
    }
    return [{ selector: cached.healed_selector, strategy: 'primary' }];
  }

  private async store(
    pageKey: string,
    brokenSelector: string,
    intent: string,
    input: {
      selector: string;
      confidence: number;
      reason: string;
      locators: StoredLocator[];
      source: 'xai' | 'deterministic';
      contract?: TargetContract;
      computedConfidence?: number;
      matchCount?: number;
    },
  ): Promise<void> {
    const matchCount = input.matchCount ?? await this.page.locator(input.selector).count();
    const computedConfidence = input.computedConfidence
      ?? scoreConfidence(input.selector, input.confidence, matchCount).computedConfidence;
    this.cache.upsert({
      pageKey,
      brokenSelector,
      intent,
      healedSelector: input.selector,
      locators: input.locators,
      modelConfidence: scoreConfidence(input.selector, input.confidence, matchCount).modelConfidence,
      computedConfidence,
      matchCount,
      reason: input.reason,
      domHash: LocatorCache.domHash(await captureInteractiveDom(this.page)),
      source: input.source,
    });
  }

  private dedupe(locators: StoredLocator[]): StoredLocator[] {
    const seen = new Set<string>();
    return locators.filter((l) => (seen.has(l.selector) ? false : seen.add(l.selector) && true));
  }

  private async resolveAgainstContract(
    locator: Locator,
    contract?: TargetContract,
  ): Promise<Locator | null> {
    if (await locator.count() === 0) return null;
    if (!contract) return locator.first();
    const satisfying = await contractMatches(locator, contract);
    if (satisfying.length !== 1) return null;
    return locator.nth(satisfying[0]);
  }

  private event(partial: Omit<HealEvent, 'timestamp' | 'contractValidated'> & { contract?: TargetContract }): HealEvent {
    const { contract, ...rest } = partial;
    return { ...rest, contractValidated: Boolean(contract), timestamp: new Date().toISOString() };
  }

  private record(event: HealEvent): void {
    this.events.push(event);
    mkdirSync(logDirectory, { recursive: true });
    appendFileSync(logFile, `${JSON.stringify(event)}\n`);
  }
}
