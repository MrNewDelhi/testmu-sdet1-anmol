import { test as base, expect } from '@playwright/test';
import { SelfHealingService } from '../framework/self-healing/SelfHealingService.js';

type HealingFixtures = {
  healing: SelfHealingService;
};

export const test = base.extend<HealingFixtures>({
  healing: async ({ page }, use, testInfo) => {
    const healing = new SelfHealingService(page);
    await use(healing);

    if (healing.events.length > 0) {
      await testInfo.attach('self-healing-events', {
        body: JSON.stringify(healing.events, null, 2),
        contentType: 'application/json',
      });
    }
  },
});

export { expect };
