import type { Locator, Page } from '@playwright/test';
import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { XaiClient, type SelectorRepairResponse } from '../../ai/XaiClient.js';
import { captureInteractiveDom } from './DomSnapshot.js';

const here = resolve(process.cwd(), 'src/agents/self-healing');
const logFile = resolve(here, 'heal-log.v1.jsonl');

export interface NaiveHealResult extends SelectorRepairResponse {
  brokenSelector: string;
  intent: string;
  source: 'xai';
}

export class NaiveSelfHealingLocator {
  readonly heals: NaiveHealResult[] = [];

  constructor(
    private readonly page: Page,
    private readonly xai = new XaiClient(),
  ) {}

  async locate(brokenSelector: string, intent: string): Promise<Locator> {
    try {
      const original = this.page.locator(brokenSelector);
      if (await original.count() > 0) {
        return original.first();
      }

      throw new Error(`No element matched ${brokenSelector}`);
    } catch {
      const domSnapshot = await captureInteractiveDom(this.page);
      const repaired = await this.xai.repairSelector({
        brokenSelector,
        intent,
        domSnapshot,
        url: this.page.url(),
      });

      const repairedLocator = this.page.locator(repaired.selector);
      if (await repairedLocator.count() === 0) {
        throw new Error(`xAI suggested selector "${repaired.selector}", but it matched no elements.`);
      }

      const event: NaiveHealResult = {
        ...repaired,
        brokenSelector,
        intent,
        source: 'xai',
      };
      this.heals.push(event);
      this.writeLog(event);

      return repairedLocator.first();
    }
  }

  private writeLog(event: NaiveHealResult): void {
    mkdirSync(here, { recursive: true });
    appendFileSync(logFile, `${JSON.stringify({ ...event, timestamp: new Date().toISOString() })}\n`);
  }
}
