import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * SQLite-backed cache of healed locators (quick POC).
 *
 * Purpose: skip the (slow, paid) xAI round-trip when we have already healed
 * this exact break before. The cache is a fast-path only — callers still
 * re-validate the cached selector against the live DOM before using it, so a
 * stale entry can never make a test act on the wrong element.
 *
 * Identity of a "healing situation" = (page_key, broken_selector, intent).
 * Using node:sqlite (built into Node) keeps this dependency-free for the POC.
 */

const defaultDbPath = resolve(process.cwd(), 'src/agents/self-healing/locator-cache.sqlite');

export interface StoredLocator {
  selector: string;
  strategy: string;
}

export interface CacheEntry {
  id: number;
  page_key: string;
  broken_selector: string;
  intent: string;
  healed_selector: string;
  /** JSON array of attribute-diverse fallback locators (StoredLocator[]). */
  locators: string;
  model_confidence: number;
  computed_confidence: number;
  match_count: number;
  reason: string;
  dom_hash: string;
  source: string;
  hit_count: number;
  created_at: string;
  last_used_at: string;
}

export interface CacheUpsert {
  pageKey: string;
  brokenSelector: string;
  intent: string;
  healedSelector: string;
  /** Ranked, attribute-diverse locators for the same target (id, testid, ...). */
  locators: StoredLocator[];
  modelConfidence: number;
  computedConfidence: number;
  matchCount: number;
  reason: string;
  domHash: string;
  /** How the entry was produced: 'xai' (LLM) or 'deterministic' (local). */
  source?: 'xai' | 'deterministic';
}

export class LocatorCache {
  private readonly db: DatabaseSync;

  constructor(dbPath: string = defaultDbPath) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS locator_cache (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        page_key          TEXT NOT NULL,   -- normalized page identity (part of key)
        broken_selector   TEXT NOT NULL,   -- selector that failed (part of key)
        intent            TEXT NOT NULL,   -- human intent string (part of key)
        healed_selector   TEXT NOT NULL,   -- primary validated selector (cached payload)
        locators          TEXT NOT NULL DEFAULT '[]', -- ranked attribute-diverse fallback locators (JSON)
        model_confidence  REAL NOT NULL,   -- xAI self-reported confidence
        computed_confidence REAL NOT NULL, -- our uniqueness/stability score
        match_count       INTEGER NOT NULL,-- elements the healed selector matched
        reason            TEXT NOT NULL,   -- xAI explanation, kept for the report
        dom_hash          TEXT NOT NULL,   -- hash of DOM snapshot at heal time (drift signal)
        source            TEXT NOT NULL,   -- 'xai' when written
        hit_count         INTEGER NOT NULL DEFAULT 0,
        created_at        TEXT NOT NULL,
        last_used_at      TEXT NOT NULL,
        UNIQUE(page_key, broken_selector, intent)
      );
    `);
    // Migrate pre-existing DB files that predate the multi-locator column.
    try {
      this.db.exec(`ALTER TABLE locator_cache ADD COLUMN locators TEXT NOT NULL DEFAULT '[]'`);
    } catch {
      // Column already exists.
    }
  }

  /** Normalize a URL into a stable page key (route param for OpenCart, else pathname). */
  static pageKey(url: string): string {
    try {
      const parsed = new URL(url);
      const route = parsed.searchParams.get('route');
      return route ? `route=${route}` : parsed.pathname;
    } catch {
      return url;
    }
  }

  /** Short hash of the DOM snapshot, used to detect page drift. */
  static domHash(domSnapshot: string): string {
    return createHash('sha256').update(domSnapshot).digest('hex').slice(0, 16);
  }

  get(pageKey: string, brokenSelector: string, intent: string): CacheEntry | undefined {
    const row = this.db
      .prepare(
        `SELECT * FROM locator_cache
         WHERE page_key = ? AND broken_selector = ? AND intent = ?`,
      )
      .get(pageKey, brokenSelector, intent) as CacheEntry | undefined;
    return row;
  }

  /** Insert or replace an entry; preserves created_at on update, resets usage. */
  upsert(entry: CacheUpsert): void {
    const now = new Date().toISOString();
    const source = entry.source ?? 'xai';
    this.db
      .prepare(
        `INSERT INTO locator_cache
           (page_key, broken_selector, intent, healed_selector, locators, model_confidence,
            computed_confidence, match_count, reason, dom_hash, source,
            hit_count, created_at, last_used_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
         ON CONFLICT(page_key, broken_selector, intent) DO UPDATE SET
           healed_selector = excluded.healed_selector,
           locators = excluded.locators,
           model_confidence = excluded.model_confidence,
           computed_confidence = excluded.computed_confidence,
           match_count = excluded.match_count,
           reason = excluded.reason,
           dom_hash = excluded.dom_hash,
           source = excluded.source,
           last_used_at = excluded.last_used_at`,
      )
      .run(
        entry.pageKey,
        entry.brokenSelector,
        entry.intent,
        entry.healedSelector,
        JSON.stringify(entry.locators ?? []),
        entry.modelConfidence,
        entry.computedConfidence,
        entry.matchCount,
        entry.reason,
        entry.domHash,
        source,
        now,
        now,
      );
  }

  /** Record a cache hit: bump hit_count and last_used_at. */
  recordHit(id: number): void {
    this.db
      .prepare(`UPDATE locator_cache SET hit_count = hit_count + 1, last_used_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), id);
  }

  close(): void {
    this.db.close();
  }
}
