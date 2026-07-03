import type { Locator, Page } from '@playwright/test';
import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { XaiClient, type SelectorRepairResponse } from '../../ai/XaiClient.js';
import { captureInteractiveDom } from '../../agents/self-healing/DomSnapshot.js';
import { CONFIDENCE_THRESHOLD, scoreConfidence } from './confidence.js';
import { LocatorCache } from './LocatorCache.js';
import { contractMatches, describeContract, type TargetContract } from './contract.js';

const logDirectory = resolve(process.cwd(), 'src/agents/self-healing');
const logFile = resolve(logDirectory, 'heal-log.v2.jsonl');

export interface HealEvent extends SelectorRepairResponse {
  brokenSelector: string;
  intent: string;
  /** 'cache' when served from the locator cache, 'xai' when freshly repaired. */
  source: 'xai' | 'cache';
  version: 'v2-centralized' | 'v4-contract';
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
  ) {}

  /**
   * @param contract Optional structured description of the intended element.
   *   When provided, the healed element must satisfy it (role/type/ancestor/
   *   text) or the heal is refused — this is what stops a confident-but-wrong
   *   repair (e.g. a header nav link) from being clicked.
   */
  async locator(selector: string, intent: string, contract?: TargetContract): Promise<Locator> {
    const original = this.page.locator(selector);
    if (await original.count() > 0) {
      return original.first();
    }

    const pageKey = LocatorCache.pageKey(this.page.url());

    // Fast path: reuse a previously healed selector without calling xAI, but
    // only after re-validating it against the current DOM (and contract).
    const cached = this.cache.get(pageKey, selector, intent);
    if (cached) {
      const cachedLocator = this.page.locator(cached.healed_selector);
      const target = await this.resolveAgainstContract(cachedLocator, contract);
      if (target) {
        this.cache.recordHit(cached.id);
        this.record({
          selector: cached.healed_selector,
          confidence: cached.model_confidence,
          reason: cached.reason,
          brokenSelector: selector,
          intent,
          source: 'cache',
          version: contract ? 'v4-contract' : 'v2-centralized',
          computedConfidence: cached.computed_confidence,
          matchCount: cached.match_count,
          contractValidated: Boolean(contract),
          timestamp: new Date().toISOString(),
        });
        return target;
      }
      // Cached selector no longer valid (page drifted) -> fall through to re-heal.
    }

    // Slow path: ask xAI for a repair. The contract description is appended to
    // the intent to improve the model's recall of the right element.
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

    // Gate on a programmatic score, not the model's self-reported confidence.
    const score = scoreConfidence(repaired.selector, repaired.confidence, matchCount);
    if (score.computedConfidence < CONFIDENCE_THRESHOLD) {
      throw new Error(
        `Refusing to heal "${selector}": computed confidence ${score.computedConfidence} ` +
          `(model=${score.modelConfidence}, matches=${matchCount}) is below ${CONFIDENCE_THRESHOLD}.`,
      );
    }

    // Semantic gate: the healed element must satisfy the target contract, so a
    // confident-but-wrong repair (e.g. the header login link) is refused.
    const target = await this.resolveAgainstContract(healed, contract);
    if (!target) {
      throw new Error(
        `Refusing to heal "${selector}": xAI suggested "${repaired.selector}", but no single element ` +
          `matched the target contract ${JSON.stringify(contract)}.`,
      );
    }

    this.cache.upsert({
      pageKey,
      brokenSelector: selector,
      intent,
      healedSelector: repaired.selector,
      modelConfidence: score.modelConfidence,
      computedConfidence: score.computedConfidence,
      matchCount,
      reason: repaired.reason,
      domHash: LocatorCache.domHash(domSnapshot),
    });

    this.record({
      ...repaired,
      brokenSelector: selector,
      intent,
      source: 'xai',
      version: contract ? 'v4-contract' : 'v2-centralized',
      computedConfidence: score.computedConfidence,
      matchCount,
      contractValidated: Boolean(contract),
      timestamp: new Date().toISOString(),
    });

    return target;
  }

  /**
   * Resolve a locator to the single element that is valid to use.
   * - No contract: require a live match and use the first.
   * - With a contract: exactly one matched element must satisfy it; zero
   *   (violation) or more than one (ambiguous) returns null so the caller refuses.
   */
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

  private record(event: HealEvent): void {
    this.events.push(event);
    mkdirSync(logDirectory, { recursive: true });
    appendFileSync(logFile, `${JSON.stringify(event)}\n`);
  }
}
