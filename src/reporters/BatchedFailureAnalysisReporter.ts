import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { FailureExplainer } from '../framework/failure-analysis/FailureExplainer.js';

interface FailureContext {
  title: string;
  file: string;
  error: string;
  url: string;
  domSnapshot: string;
  screenshotBase64?: string;
}

// Stored outside test-results (which Playwright wipes at the start of each run)
// so run history survives between runs. Gitignored via *.json in this dir.
const historyFile = resolve(process.cwd(), 'src/agents/self-healing/failure-history.json');
const MAX_GROUPS = Number(process.env.FAILURE_ANALYSIS_BUDGET ?? 10);

/**
 * Mode B: analyze failures AFTER the run, not per test.
 *
 * Why this is better than mode A for a real suite:
 * - Batching + dedup by error signature: one root cause failing many tests
 *   collapses to a single LLM call, and the cascade size becomes a signal.
 * - Enrichment the model was missing (the "context gap"): each group is sent the
 *   test's previous-run status (new vs persistent failure), whether its file was
 *   recently changed (git), and the run's changed files — so classification is
 *   grounded instead of guessed.
 */
export default class BatchedFailureAnalysisReporter implements Reporter {
  private readonly contexts = new Map<string, FailureContext>(); // final failure per test
  private readonly statuses = new Map<string, string>(); // title -> final status

  onTestEnd(test: TestCase, result: TestResult): void {
    const title = test.titlePath().join(' > ');
    this.statuses.set(title, result.status); // last attempt wins -> final status

    if (result.status === 'passed' || result.status === 'skipped') {
      this.contexts.delete(title); // recovered on retry
      return;
    }
    const attachment = result.attachments.find((a) => a.name === 'failure-context');
    if (!attachment) return;
    const raw = attachment.body?.toString('utf-8')
      ?? (attachment.path ? readFileSync(attachment.path, 'utf-8') : '');
    try {
      this.contexts.set(title, JSON.parse(raw) as FailureContext);
    } catch {
      // Ignore malformed context.
    }
  }

  async onEnd(_result: FullResult): Promise<void> {
    const history = this.loadHistory();
    const changedFiles = this.gitChangedFiles();

    // Group final failures by error signature (dedup cascades). Key on the
    // reporter's own title so it matches the saved history.
    const groups = new Map<string, Array<{ title: string; ctx: FailureContext }>>();
    for (const [title, ctx] of this.contexts) {
      const signature = this.signature(ctx.error);
      const list = groups.get(signature) ?? [];
      list.push({ title, ctx });
      groups.set(signature, list);
    }

    const explainer = new FailureExplainer();
    const records: unknown[] = [];
    let analyzed = 0;
    for (const [signature, members] of groups) {
      const lead = members[0].ctx;
      const leadTitle = members[0].title;
      const tests = members.map((m) => m.title);
      if (analyzed >= MAX_GROUPS || !process.env.XAI_API_KEY) {
        records.push({ signature, tests, cascadeCount: members.length, analysis: null, skipped: true });
        continue;
      }
      analyzed += 1;
      const testFileChanged = changedFiles.some((f) => lead.file.endsWith(f));
      const priorStatus = (history[leadTitle] as 'passed' | 'failed' | undefined) ?? 'unknown';
      try {
        const analysis = await explainer.explain({
          title: leadTitle,
          error: lead.error,
          url: lead.url,
          domSnapshot: lead.domSnapshot,
          screenshotBase64: lead.screenshotBase64,
          priorStatus,
          testFileChanged,
          changedFiles: changedFiles.slice(0, 20),
          cascadeCount: members.length,
        });
        records.push({ signature, tests, cascadeCount: members.length, priorStatus, testFileChanged, analysis });
      } catch (error) {
        records.push({ signature, tests, cascadeCount: members.length, error: String(error) });
      }
    }

    this.writeReport(records);
    this.saveHistory();
    if (records.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`\nBatched failure analysis: ${records.length} group(s) from ${this.contexts.size} failure(s) -> playwright-report/failure-analysis.html`);
    }
  }

  private signature(error: string): string {
    // The first Playwright line ("expect(...).toHaveText(expected) failed") is
    // generic; include the discriminating lines (Expected/Received/Locator/error)
    // so different assertions do not collapse, while a true cascade still groups.
    const lines = error.split('\n').map((l) => l.trim());
    const key = lines.filter((l) => /^(Error:|Expected|Received|Locator:|Timeout|expect\()/i.test(l));
    return (key.length ? key : [lines[0] ?? '']).join(' | ').replace(/\s+/g, ' ').replace(/\d+ms/g, '').slice(0, 220);
  }

  private gitChangedFiles(): string[] {
    try {
      const tracked = execSync('git diff --name-only HEAD', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
      const untracked = execSync('git ls-files --others --exclude-standard', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
      return [...tracked.split('\n'), ...untracked.split('\n')].map((s) => s.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }

  private loadHistory(): Record<string, string> {
    try {
      if (existsSync(historyFile)) return JSON.parse(readFileSync(historyFile, 'utf-8')) as Record<string, string>;
    } catch {
      // Fresh history.
    }
    return {};
  }

  private saveHistory(): void {
    try {
      mkdirSync(resolve(process.cwd(), 'src/agents/self-healing'), { recursive: true });
      writeFileSync(historyFile, JSON.stringify(Object.fromEntries(this.statuses), null, 2));
    } catch {
      // Non-fatal.
    }
  }

  private writeReport(records: unknown[]): void {
    const dir = resolve(process.cwd(), 'playwright-report');
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'failure-analysis.json'), JSON.stringify(records, null, 2));
    const escape = (s: string): string => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
    const cards = records.length === 0
      ? '<p>No failures analyzed.</p>'
      : (records as Array<Record<string, any>>).map((r) => `
        <article style="border:1px solid #dce3ee;border-radius:12px;padding:18px;margin:14px 0;background:#fff">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
            <strong>${escape(String(r.tests?.length ?? 1))} test(s) · signature</strong>
            ${r.analysis ? `<span style="background:#128a54;color:#fff;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700">${escape(r.analysis.category)}</span>` : '<span style="color:#8a5a00">not analyzed</span>'}
          </div>
          <p style="color:#5a6b80;font-size:13px">${escape(String(r.signature ?? ''))}</p>
          <p style="color:#5a6b80;font-size:12px">cascade: ${escape(String(r.cascadeCount ?? 1))} · priorStatus: ${escape(String(r.priorStatus ?? 'unknown'))} · testFileChanged: ${escape(String(r.testFileChanged ?? false))}</p>
          ${r.analysis ? `<p>${escape(r.analysis.summary)}</p><p><strong>Root cause:</strong> ${escape(r.analysis.rootCause)}</p><p><strong>Suggested fix:</strong> ${escape(r.analysis.suggestedFix)}</p>` : ''}
          <details><summary style="cursor:pointer;color:#5a6b80">tests</summary><pre style="white-space:pre-wrap">${escape((r.tests ?? []).join('\n'))}</pre></details>
        </article>`).join('');
    writeFileSync(resolve(dir, 'failure-analysis.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>Failure Analysis (batched)</title><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:900px;margin:0 auto;padding:32px;color:#131b2b">
<h1>Failure Analysis — batched (mode B)</h1>
<p style="color:#5a6b80">${records.length} group(s), enriched with run history + git diff.</p>
${cards}
</body></html>`);
  }
}
