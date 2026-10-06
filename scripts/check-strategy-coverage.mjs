#!/usr/bin/env node
/**
 * Verifies that docs/STRATEGY.md contains a valid table row for every component directory
 * under projects/ui/src/lib/components/, and enforces the layered substrate rule.
 *
 * Exits 1 (fail) when:
 *   - a component directory has no row in the table, or
 *   - a row carries a decision or complexity value outside the allowed set, or
 *   - a row names a directory that no longer exists (stale entry), or
 *   - the `**Summary:**` line's per-decision counts disagree with the table rows, or
 *   - a component classed `simple-leaf` is not on the frozen legacy list: a new simple leaf
 *     is born as a Lit element in projects/elements, never as an Angular component, or
 *   - the legacy list names a directory that is gone or no longer classed `simple-leaf`
 *     (the list only shrinks as simple leaves convert).
 */
import {readFileSync, readdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const COMPONENTS_DIR = join(ROOT, 'projects/ui/src/lib/components');
const STRATEGY_PATH = join(ROOT, 'docs/STRATEGY.md');

export const ALLOWED_DECISIONS = new Set(['keep-own', 'wrap-base', 'element-rewrite', 'delete']);
export const ALLOWED_COMPLEXITIES = new Set(['simple-leaf', 'interactive', 'templated']);

/**
 * Angular simple leaves that predate the layered substrate rule. They convert to Lit elements
 * when touched; remove an entry when its directory is converted or deleted. Never add one:
 * a new simple leaf belongs in projects/elements.
 */
export const LEGACY_SIMPLE_LEAVES = new Set([
  'area-chart',
  'badge',
  'bar-chart',
  'card',
  'chip',
  'donut-chart',
  'empty-state',
  'google-sign-in-button',
  'icon',
  'institution-avatar',
  'line-chart',
  'page-container',
  'password-strength',
  'skeleton',
  'status-indicator',
  'tag',
  'usage-chip',
]);

/**
 * Validates the component directories against the STRATEGY.md text.
 * @param {string[]} componentDirs
 * @param {string} strategyText
 * @param {Set<string>} [legacy]
 * @returns {string[]} error messages (empty when valid)
 */
export function validate(componentDirs, strategyText, legacy = LEGACY_SIMPLE_LEAVES) {
  const errors = [];

  // Expected columns: Component | Usage evidence | Complexity | Decision | Rationale
  /** @type {Map<string, {complexity: string, decision: string}>} */
  const rows = new Map();
  for (const line of strategyText.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1).map(cell => cell.trim());
    if (cells.length < 5) continue;
    const [name, , complexity, decision] = cells;
    if (name.startsWith('---') || name.toLowerCase() === 'component') continue;
    rows.set(name, {complexity, decision});
  }

  // 1. Every filesystem directory must have a table row.
  for (const dir of componentDirs) {
    if (!rows.has(dir)) errors.push(`MISSING  '${dir}' — no row in docs/STRATEGY.md`);
  }

  // 2. Every table row must carry a valid decision and complexity.
  for (const [name, {complexity, decision}] of rows) {
    if (!ALLOWED_DECISIONS.has(decision)) {
      errors.push(
        `INVALID  '${name}' — decision '${decision}' is not one of: ${[...ALLOWED_DECISIONS].join(', ')}`,
      );
    }
    if (!ALLOWED_COMPLEXITIES.has(complexity)) {
      errors.push(
        `INVALID  '${name}' — complexity '${complexity}' is not one of: ${[...ALLOWED_COMPLEXITIES].join(', ')}`,
      );
    }
  }

  // 3. No stale rows (table names a directory that no longer exists).
  const dirSet = new Set(componentDirs);
  for (const name of rows.keys()) {
    if (!dirSet.has(name)) {
      errors.push(`STALE    '${name}' — row exists in docs/STRATEGY.md but directory not found`);
    }
  }

  // 4. The Summary line must match the table's per-decision counts.
  const summary = /^\*\*Summary:\*\*\s*(.+)$/m.exec(strategyText);
  if (!summary) {
    errors.push("SUMMARY  no '**Summary:**' line found in docs/STRATEGY.md");
  } else {
    const claimed = new Map();
    for (const m of summary[1].matchAll(/(\d+)\s+([a-z-]+)/g)) claimed.set(m[2], Number(m[1]));
    for (const decision of ALLOWED_DECISIONS) {
      const actual = [...rows.values()].filter(row => row.decision === decision).length;
      const stated = claimed.get(decision);
      if (stated !== actual) {
        errors.push(`SUMMARY  '${decision}' — Summary line says ${stated ?? 'nothing'}, table has ${actual}`);
      }
    }
  }

  // 5. A simple-leaf Angular component may only be a grandfathered one.
  for (const dir of componentDirs) {
    if (rows.get(dir)?.complexity === 'simple-leaf' && !legacy.has(dir)) {
      errors.push(
        `SUBSTRATE '${dir}' — classed simple-leaf, so it must be a Lit element in projects/elements, ` +
          `not an Angular component (docs/STRATEGY.md §"Layered substrate rule"). ` +
          `If it carries framework behaviour, class it interactive or templated.`,
      );
    }
  }

  // 6. The legacy list only shrinks: no entry may outlive its directory or its classification.
  for (const name of legacy) {
    if (!dirSet.has(name) || rows.get(name)?.complexity !== 'simple-leaf') {
      errors.push(
        `LEGACY   '${name}' — listed as a legacy simple leaf but is no longer a simple-leaf ` +
          `component directory; remove it from LEGACY_SIMPLE_LEAVES`,
      );
    }
  }

  return errors;
}

function main() {
  const componentDirs = readdirSync(COMPONENTS_DIR, {withFileTypes: true})
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
  const errors = validate(componentDirs, readFileSync(STRATEGY_PATH, 'utf8'));

  if (errors.length > 0) {
    for (const message of errors) console.error(message);
    console.error(
      `\nStrategy coverage: ${errors.length} error(s). Update docs/STRATEGY.md to fix.\n` +
        `  Allowed decisions:    ${[...ALLOWED_DECISIONS].join(' | ')}\n` +
        `  Allowed complexities: ${[...ALLOWED_COMPLEXITIES].join(' | ')}\n` +
        `  Components dir:       ${COMPONENTS_DIR}\n` +
        `  Strategy file:        ${STRATEGY_PATH}`,
    );
    process.exit(1);
  }

  console.log(
    `Strategy coverage OK — ${componentDirs.length} component(s) checked, all have valid rows.`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
