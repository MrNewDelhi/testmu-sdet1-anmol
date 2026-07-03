import type { Page } from '@playwright/test';
import type { TargetContract } from './contract.js';

/**
 * Deterministic-first locator resolution to cut token cost, and multi-locator
 * generation to make the cache resilient.
 *
 * Before paying for an xAI call, try to rebuild the locator locally (the way a
 * tool like SelectorHub would): narrow the page's interactive elements by the
 * contract and/or the unique keywords in the intent, and if exactly ONE element
 * survives, emit its top few stable selectors built from *different attributes*
 * (id, data-testid, name, aria-label, form+type). Each is verified to resolve
 * to a single element in the live DOM.
 *
 * Storing several attribute-diverse locators (not just one) means that if a
 * single attribute later changes — say the id is renamed — the cached entry can
 * still heal from the data-testid or form+type locator without another LLM call.
 * If nothing can be narrowed/verified, we return an empty list and the caller
 * escalates to the model.
 */

export interface DeterministicResult {
  selector: string;
  /** Which attribute produced the selector: id, data-testid, name, aria-label, form+type. */
  strategy: string;
}

// Generic words that do not help identify a specific element.
const STOPWORDS = new Set([
  'the', 'a', 'an', 'for', 'of', 'to', 'and', 'or', 'in', 'on', 'is', 'are', 'be',
  'primary', 'please', 'button', 'link', 'field', 'input', 'page', 'form', 'click',
  'select', 'main', 'with', 'that', 'this', 'element', 'control',
]);

function keywordsFromIntent(intent: string): string[] {
  const words = intent.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return Array.from(new Set(words)).filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

// Browser-side helpers, serialized into page.evaluate. Kept as a single string
// so both entry points (candidates / locatorsFor) share one implementation.
const BROWSER_HELPERS = `
  const esc = (value) => (window.CSS && CSS.escape) ? CSS.escape(value) : String(value).replace(/["\\\\]/g, '\\\\$&');
  const isUnique = (selector) => { try { return document.querySelectorAll(selector).length === 1; } catch { return false; } };
  const implicitRole = (el) => {
    const explicit = el.getAttribute('role');
    if (explicit) return explicit;
    const tag = el.tagName.toLowerCase();
    if (tag === 'a' && el.hasAttribute('href')) return 'link';
    if (tag === 'button') return 'button';
    if (tag === 'select' || tag === 'textarea') return 'textbox';
    if (tag === 'input') {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      if (['submit','button','reset','image'].includes(type)) return 'button';
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      return 'textbox';
    }
    return '';
  };
  const accessibleText = (el) => (el.innerText || el.textContent || el.getAttribute('value') || el.getAttribute('aria-label') || '').trim();
  const satisfiesContract = (el, c) => {
    if (!c) return true;
    if (c.role && implicitRole(el) !== c.role) return false;
    if (c.tags && !c.tags.includes(el.tagName.toLowerCase())) return false;
    if (c.type && (el.getAttribute('type') || '').toLowerCase() !== c.type.toLowerCase()) return false;
    if (c.withinForm && !el.closest(c.withinForm)) return false;
    if (c.textLike && !new RegExp(c.textLike, 'i').test(accessibleText(el))) return false;
    return true;
  };
  // Up to \`limit\` attribute-diverse, individually-unique selectors for one element.
  const topLocators = (el, limit) => {
    const out = [];
    const push = (selector, strategy) => {
      if (out.length < limit && isUnique(selector) && !out.some((o) => o.selector === selector)) {
        out.push({ selector, strategy });
      }
    };
    if (el.id) push('#' + esc(el.id), 'id');
    const testid = el.getAttribute('data-testid');
    if (testid) push('[data-testid="' + testid + '"]', 'data-testid');
    const name = el.getAttribute('name');
    if (name) push(el.tagName.toLowerCase() + '[name="' + name + '"]', 'name');
    const aria = el.getAttribute('aria-label');
    if (aria) push('[aria-label="' + aria + '"]', 'aria-label');
    const form = el.closest('form');
    const type = el.getAttribute('type');
    if (form && form.id && type) push('#' + esc(form.id) + ' ' + el.tagName.toLowerCase() + '[type="' + type + '"]', 'form+type');
    return out;
  };
`;

export class DeterministicLocator {
  /** How many attribute-diverse locators to keep per target. */
  static readonly MAX_LOCATORS = 3;

  /**
   * Narrow the page to a single intended element (by contract, else by unique
   * intent keywords) and return its top attribute-diverse locators. Empty when
   * the narrowing is ambiguous or nothing verifiable can be built.
   */
  async candidates(page: Page, intent: string, contract?: TargetContract): Promise<DeterministicResult[]> {
    const keywords = contract ? [] : keywordsFromIntent(intent);
    const limit = DeterministicLocator.MAX_LOCATORS;

    return page.evaluate(
      // eslint-disable-next-line no-new-func
      new Function('args', `
        ${BROWSER_HELPERS}
        const { contract, keywords, limit } = args;
        const interactive = Array.from(document.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="link"]'));
        let candidates = interactive;
        if (contract) candidates = candidates.filter((el) => satisfiesContract(el, contract));
        if (keywords.length) {
          candidates = candidates.filter((el) => {
            const haystack = [el.id, el.getAttribute('name'), el.getAttribute('data-testid'), el.getAttribute('aria-label'), el.getAttribute('placeholder'), accessibleText(el)]
              .filter(Boolean).join(' ').toLowerCase();
            return keywords.every((k) => haystack.includes(k));
          });
        }
        if (candidates.length !== 1) return [];
        return topLocators(candidates[0], limit);
      `) as (args: unknown) => DeterministicResult[],
      { contract: contract ?? null, keywords, limit },
    );
  }

  /**
   * Top attribute-diverse locators for whatever element `selector` currently
   * resolves to (used to enrich an xAI repair with fallback locators).
   */
  async locatorsFor(page: Page, selector: string): Promise<DeterministicResult[]> {
    const limit = DeterministicLocator.MAX_LOCATORS;
    return page.evaluate(
      // eslint-disable-next-line no-new-func
      new Function('args', `
        ${BROWSER_HELPERS}
        const { selector, limit } = args;
        let els;
        try { els = document.querySelectorAll(selector); } catch { return []; }
        if (els.length !== 1) return [];
        return topLocators(els[0], limit);
      `) as (args: unknown) => DeterministicResult[],
      { selector, limit },
    );
  }
}
