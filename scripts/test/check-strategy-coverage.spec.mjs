import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {test} from 'node:test';
import {LEGACY_SIMPLE_LEAVES, validate} from '../check-strategy-coverage.mjs';

const table = rows =>
  [
    '| Component | Usage evidence | Complexity | Decision | Rationale |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(([name, complexity, decision]) => `| ${name} | fs 0 · dash 0 | ${complexity} | ${decision} | why |`),
    '',
    `**Summary:** ${rows.filter(r => r[2] === 'keep-own').length} keep-own · ${
      rows.filter(r => r[2] === 'element-rewrite').length
    } element-rewrite · 0 wrap-base · 0 delete`,
  ].join('\n');

const legacy = new Set(['old-card']);
const base = [
  ['old-card', 'simple-leaf', 'element-rewrite'],
  ['dialog', 'templated', 'keep-own'],
];

test('accepts a grandfathered simple leaf and a behavioural component', () => {
  assert.deepEqual(validate(['old-card', 'dialog'], table(base), legacy), []);
});

test('rejects a new simple-leaf Angular component', () => {
  const rows = [...base, ['new-badge', 'simple-leaf', 'element-rewrite']];
  const errors = validate(['old-card', 'dialog', 'new-badge'], table(rows), legacy);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^SUBSTRATE 'new-badge'/);
});

test('accepts a new behavioural component', () => {
  const rows = [...base, ['combobox', 'interactive', 'keep-own']];
  assert.deepEqual(validate(['old-card', 'dialog', 'combobox'], table(rows), legacy), []);
});

test('rejects an unknown complexity class', () => {
  const rows = [...base, ['thing', 'tiny', 'keep-own']];
  const errors = validate(['old-card', 'dialog', 'thing'], table(rows), legacy);
  assert.ok(errors.some(e => /^INVALID {2}'thing' — complexity 'tiny'/.test(e)));
});

test('rejects a legacy entry whose directory is gone', () => {
  const errors = validate(['dialog'], table([base[1]]), legacy);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^LEGACY {3}'old-card'/);
});

test('rejects a legacy entry that was reclassified', () => {
  const rows = [['old-card', 'interactive', 'keep-own'], base[1]];
  const errors = validate(['old-card', 'dialog'], table(rows), legacy);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^LEGACY {3}'old-card'/);
});

test('the real inventory passes', () => {
  const dirs = readdirSync(new URL('../../projects/ui/src/lib/components', import.meta.url), {
    withFileTypes: true,
  })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
  const text = readFileSync(new URL('../../docs/STRATEGY.md', import.meta.url), 'utf8');
  assert.deepEqual(validate(dirs, text), []);
  assert.ok(LEGACY_SIMPLE_LEAVES.size > 0);
});
