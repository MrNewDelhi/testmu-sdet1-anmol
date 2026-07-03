import type { Locator } from '@playwright/test';

/**
 * A structured description of *which* element a heal is allowed to target.
 *
 * The problem this solves: on a login page two controls can both read like
 * "login" — a header nav link (an <a> that navigates) and the form submit
 * button. When the submit selector breaks and we ask xAI to repair it, the
 * model can confidently return the header link instead. Existence checks
 * (count > 0) and confidence scoring (a unique, stable <a> scores high) do
 * NOT catch that — the wrong element sails through.
 *
 * The fix is to verify the model's answer against a checkable contract rather
 * than trust it. A submit button is `role=button`, `type=submit`, and lives
 * inside the login form; the header link is a `link` outside the form, so it
 * fails the contract deterministically and is refused.
 */
export interface TargetContract {
  /** Expected accessible role (explicit or implicit), e.g. 'button' vs 'link'. */
  role?: 'button' | 'link' | 'textbox' | 'checkbox' | 'radio';
  /** Acceptable lowercase tag names, e.g. ['button', 'input']. */
  tags?: string[];
  /** Required `type` attribute, e.g. 'submit'. */
  type?: string;
  /** CSS selector an ancestor of the target must match, e.g. '#login-form'. */
  withinForm?: string;
  /** Regex source matched against the element's accessible-ish text. */
  textLike?: string;
}

/** Human-readable hint appended to the intent sent to xAI (improves recall). */
export function describeContract(contract: TargetContract): string {
  const parts: string[] = [];
  if (contract.role) parts.push(`role=${contract.role}`);
  if (contract.type) parts.push(`type=${contract.type}`);
  if (contract.withinForm) parts.push(`inside ${contract.withinForm}`);
  if (contract.textLike) parts.push(`text~=/${contract.textLike}/i`);
  return parts.length ? `(target must be: ${parts.join(', ')})` : '';
}

/**
 * Return the indices (within the locator's matched set) of elements that
 * satisfy the contract. Runs in the browser so it can read live roles,
 * types, ancestry, and text.
 */
export async function contractMatches(
  locator: Locator,
  contract: TargetContract,
): Promise<number[]> {
  return locator.evaluateAll((elements, c: TargetContract) => {
    const implicitRole = (el: Element): string => {
      const explicit = el.getAttribute('role');
      if (explicit) return explicit;
      const tag = el.tagName.toLowerCase();
      if (tag === 'a' && el.hasAttribute('href')) return 'link';
      if (tag === 'button') return 'button';
      if (tag === 'select' || tag === 'textarea') return 'textbox';
      if (tag === 'input') {
        const type = (el.getAttribute('type') || 'text').toLowerCase();
        if (['submit', 'button', 'reset', 'image'].includes(type)) return 'button';
        if (type === 'checkbox') return 'checkbox';
        if (type === 'radio') return 'radio';
        return 'textbox';
      }
      return '';
    };

    const accessibleText = (el: Element): string =>
      ((el as HTMLElement).innerText
        || el.textContent
        || el.getAttribute('value')
        || el.getAttribute('aria-label')
        || '').trim();

    const satisfying: number[] = [];
    elements.forEach((el, index) => {
      if (c.role && implicitRole(el) !== c.role) return;
      if (c.tags && !c.tags.includes(el.tagName.toLowerCase())) return;
      if (c.type && (el.getAttribute('type') || '').toLowerCase() !== c.type.toLowerCase()) return;
      if (c.withinForm && !el.closest(c.withinForm)) return;
      if (c.textLike && !new RegExp(c.textLike, 'i').test(accessibleText(el))) return;
      satisfying.push(index);
    });
    return satisfying;
  }, contract);
}
