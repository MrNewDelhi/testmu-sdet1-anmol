import type { Locator, Page } from '@playwright/test';
import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { XaiClient, type SelectorRepairResponse } from '../../ai/XaiClient.js';
import { captureInteractiveDom } from '../../agents/self-healing/DomSnapshot.js';
import { CONFIDENCE_THRESHOLD, scoreConfidence } from './confidence.js';
import { LocatorCache } from './LocatorCache.js';

const logDirectory = resolve(process.cwd(), 'src/agents/self-healing');
const logFile = resolve(logDirectory, 'heal-log.v2.jsonl');

export interface HealEvent extends SelectorRepairResponse {
  brokenSelector: string;
  intent: string;
  /** 'cache' when served from the locator cache, 'xai' when freshly repaired. */
  source: 'xai' | 'cache';
  version: 'v2-centralized';
  /** Our programmatic score; distinct from the model's self-reported confidence. */
  computedConfidence: number;
  matchCount: number;
  timestamp: string;
}

export class SelfHealingService {
  readonly events: HealEvent[] = [];

  constructor(
    private readonly page: Page,
    private readonly xai = new XaiClient(),
    private readonly cache = new LocatorCache(),
  ) {}

  async locator(selector: string, intent: string): Promise<Locator> {
    const original = this.page.locator(selector);
    if (await original.count() > 0) {
      return original.first();
    }

    const pageKey = LocatorCache.pageKey(this.page.url());

    // Fast path: reuse a previously healed selector without calling xAI, but
    // only after re-validating it against the current DOM.
    const cached = this.cache.get(pageKey, selector, intent);
    if (cached) {
      const cachedLocator = this.page.locator(cached.healed_selector);
      if (await cachedLocator.count() > 0) {
        this.cache.recordHit(cached.id);
        this.record({
          selector: cached.healed_selector,
          confidence: cached.model_confidence,
          reason: cached.reason,
          brokenSelector: selector,
          intent,
          source: 'cache',
          version: 'v2-centralized',
          computedConfidence: cached.computed_confidence,
          matchCount: cached.match_count,
          timestamp: new Date().toISOString(),
        });
        return cachedLocator.first();
      }
      // Cached selector no longer matches (page drifted) -> fall through to re-heal.
    }

    // Slow path: ask xAI for a repair.
    const domSnapshot = await captureInteractiveDom(this.page);
    const repaired = await this.xai.repairSelector({
      brokenSelector: selector,
      intent,
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
      version: 'v2-centralized',
      computedConfidence: score.computedConfidence,
      matchCount,
      timestamp: new Date().toISOString(),
    });

    return healed.first();
  }

  private record(event: HealEvent): void {
    this.events.push(event);
    mkdirSync(logDirectory, { recursive: true });
    appendFileSync(logFile, `${JSON.stringify(event)}\n`);
  }
}
