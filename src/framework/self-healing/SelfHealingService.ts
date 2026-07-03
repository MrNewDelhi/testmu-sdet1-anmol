import type { Locator, Page } from '@playwright/test';
import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { XaiClient, type SelectorRepairResponse } from '../../ai/XaiClient.js';
import { captureInteractiveDom } from '../../agents/self-healing/DomSnapshot.js';

const logDirectory = resolve(process.cwd(), 'src/agents/self-healing');
const logFile = resolve(logDirectory, 'heal-log.v2.jsonl');

export interface HealEvent extends SelectorRepairResponse {
  brokenSelector: string;
  intent: string;
  source: 'xai';
  version: 'v2-centralized';
  timestamp: string;
}

export class SelfHealingService {
  readonly events: HealEvent[] = [];

  constructor(
    private readonly page: Page,
    private readonly xai = new XaiClient(),
  ) {}

  async locator(selector: string, intent: string): Promise<Locator> {
    try {
      const original = this.page.locator(selector);
      if (await original.count() > 0) {
        return original.first();
      }

      throw new Error(`No element matched ${selector}`);
    } catch {
      const domSnapshot = await captureInteractiveDom(this.page);
      const repaired = await this.xai.repairSelector({
        brokenSelector: selector,
        intent,
        domSnapshot,
        url: this.page.url(),
      });

      const healed = this.page.locator(repaired.selector);
      if (await healed.count() === 0) {
        throw new Error(`xAI suggested selector "${repaired.selector}", but it matched no elements.`);
      }

      this.record({
        ...repaired,
        brokenSelector: selector,
        intent,
        source: 'xai',
        version: 'v2-centralized',
        timestamp: new Date().toISOString(),
      });

      return healed.first();
    }
  }

  private record(event: HealEvent): void {
    this.events.push(event);
    mkdirSync(logDirectory, { recursive: true });
    appendFileSync(logFile, `${JSON.stringify(event)}\n`);
  }
}
