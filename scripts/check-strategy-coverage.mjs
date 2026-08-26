#!/usr/bin/env node
/**
 * Verifies that docs/STRATEGY.md contains a valid table row for every component directory
 * under projects/ui/src/lib/components/.
 *
 * Exits 1 (fail) when:
 *   - a component directory has no row in the table, or
 *   - a row carries a decision value outside the allowed set, or
 *   - a row names a directory that no longer exists (stale entry).
 */
import {readFileSync, readdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const COMPONENTS_DIR = join(ROOT, 'projects/ui/src/lib/components');
const STRATEGY_PATH = join(ROOT, 'docs/STRATEGY.md');

const ALLOWED_DECISIONS = new Set(['keep-own', 'wrap-base', 'element-rewrite', 'delete']);

// ── Read component directories ────────────────────────────────────────────────
const componentDirs = readdirSync(COMPONENTS_DIR, {withFileTypes: true})
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort();

// ── Parse the inventory table from STRATEGY.md ───────────────────────────────
const strategyText = readFileSync(STRATEGY_PATH, 'utf8');

// Each data row starts with '|' and is not a header or separator line.
// Expected columns: Component | Usage evidence | Complexity | Decision | Rationale
const DATA_ROW = /^\|\s*([^|]+?)\s*\|[^|]+\|[^|]+\|\s*([^|]+?)\s*\|/;

/** @type {Map<string, string>} component → decision */
const tableRows = new Map();

for (const line of strategyText.split('\n')) {
  if (!line.startsWith('|')) continue;
  const trimmed = line.replace(/\s*\|\s*$/, '').trimStart().slice(1); // strip leading '|'
  const firstCell = trimmed.split('|')[0].trim();
  // Skip separator rows (e.g. '--- | ---') and the header row
  if (firstCell.startsWith('---') || firstCell.toLowerCase() === 'component') continue;
  const match = DATA_ROW.exec(line);
  if (!match) continue;
  tableRows.set(match[1].trim(), match[2].trim());
}

// ── Validate ──────────────────────────────────────────────────────────────────
let errors = 0;

// 1. Every filesystem directory must have a table row.
for (const dir of componentDirs) {
  if (!tableRows.has(dir)) {
    console.error(`MISSING  '${dir}' — no row in docs/STRATEGY.md`);
    errors++;
  }
}

// 2. Every table row must carry a valid decision.
for (const [name, decision] of tableRows) {
  if (!ALLOWED_DECISIONS.has(decision)) {
    console.error(
      `INVALID  '${name}' — decision '${decision}' is not one of: ${[...ALLOWED_DECISIONS].join(', ')}`,
    );
    errors++;
  }
}

// 3. No stale rows (table names a directory that no longer exists).
const dirSet = new Set(componentDirs);
for (const name of tableRows.keys()) {
  if (!dirSet.has(name)) {
    console.error(`STALE    '${name}' — row exists in docs/STRATEGY.md but directory not found`);
    errors++;
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
if (errors > 0) {
  console.error(
    `\nStrategy coverage: ${errors} error(s). Update docs/STRATEGY.md to fix.\n` +
      `  Allowed decisions: ${[...ALLOWED_DECISIONS].join(' | ')}\n` +
      `  Components dir:    ${COMPONENTS_DIR}\n` +
      `  Strategy file:     ${STRATEGY_PATH}`,
  );
  process.exit(1);
}

console.log(
  `Strategy coverage OK — ${componentDirs.length} component(s) checked, all have valid rows.`,
);
