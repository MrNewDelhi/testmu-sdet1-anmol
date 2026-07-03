import type { Page } from '@playwright/test';

export async function captureInteractiveDom(page: Page): Promise<string> {
  return page.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="link"]'),
    ).slice(0, 80);

    return nodes
      .map((node, index) => {
        const element = node as HTMLElement;
        const attrs = ['id', 'name', 'type', 'role', 'aria-label', 'data-testid', 'href', 'value', 'placeholder']
          .map((attr) => {
            const value = element.getAttribute(attr);
            return value ? `${attr}="${value}"` : null;
          })
          .filter(Boolean)
          .join(' ');

        const text = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
        const parent = element.closest('form, main, nav, header, section, article');
        const parentHint = parent
          ? `${parent.tagName.toLowerCase()}${parent.id ? `#${parent.id}` : ''}${parent.getAttribute('aria-label') ? `[aria-label="${parent.getAttribute('aria-label')}"]` : ''}`
          : 'document';

        return `${index + 1}. parent=${parentHint} <${element.tagName.toLowerCase()} ${attrs}> text="${text}"`;
      })
      .join('\n');
  });
}
