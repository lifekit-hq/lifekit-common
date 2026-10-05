// Report-only design scan: runs the impeccable detector over the library source
// and over every Storybook story (light + dark), then prints the measured bar
// and compares it with docs/design-baseline.json. Never fails on findings.
//
//   node scripts/design-scan.mjs [--source] [--storybook <base-url>] [--write-baseline]
//
// With no flags: source scan, plus a Storybook scan if --storybook is given.
// The Storybook base URL serves a built catalog (projects/ui/storybook-static).
import {spawn} from 'node:child_process';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DETECTOR = resolve(ROOT, '.claude/skills/impeccable/scripts/impeccable');
const BASELINE = resolve(ROOT, 'docs/design-baseline.json');
const THEMES = ['light', 'dark'];
const BATCH = 10;
const CONCURRENCY = 4;
const SCAN_TIMEOUT_MS = 300_000;

const args = process.argv.slice(2);
const flag = name => args.includes(name);
const sbIdx = args.indexOf('--storybook');
const storybook = sbIdx >= 0 ? args[sbIdx + 1].replace(/\/$/, '') : null;
const writeBaseline = flag('--write-baseline');

// Rule groups reported as the measured bar.
const GROUPS = {
  'low-contrast': ['low-contrast'],
  'undersized-and-tiny-text': ['undersized-ui-text', 'tiny-text'],
  'overused-font': ['overused-font'],
  'layout-transition': ['layout-transition'],
  'design-system-drift': [
    'design-system-font-size',
    'design-system-color',
    'design-system-radius',
    'design-system-font',
    'design-system-spacing',
  ],
};

const detect = (targets, extra) =>
  new Promise(done => {
    const child = spawn(DETECTOR, ['detect', '--json', ...extra, ...targets], {
      cwd: ROOT,
      env: {...process.env, TMPDIR: '/tmp'},
    });
    let out = '';
    child.stdout.on('data', c => (out += c));
    const timer = setTimeout(() => child.kill('SIGKILL'), SCAN_TIMEOUT_MS);
    child.on('close', () => {
      clearTimeout(timer);
      try {
        done(JSON.parse(out || '[]'));
      } catch {
        done([]);
      }
    });
  });

const tally = findings => {
  const byRule = {};
  for (const f of findings) byRule[f.antipattern] = (byRule[f.antipattern] ?? 0) + 1;
  const groups = {};
  for (const [group, rules] of Object.entries(GROUPS))
    groups[group] = rules.reduce((n, r) => n + (byRule[r] ?? 0), 0);
  return {total: findings.length, groups, byRule};
};

const scanSource = async () => tally(await detect(['projects'], []));

const scanStorybook = async base => {
  const index = await (await fetch(`${base}/index.json`)).json();
  const ids = Object.values(index.entries)
    .filter(e => e.type === 'story')
    .map(e => e.id);
  const urls = THEMES.flatMap(theme =>
    ids.map(id => `${base}/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`)
  );
  const batches = [];
  for (let i = 0; i < urls.length; i += BATCH) batches.push(urls.slice(i, i + BATCH));
  const findings = [];
  let next = 0;
  await Promise.all(
    Array.from({length: CONCURRENCY}, async () => {
      while (next < batches.length)
        findings.push(...(await detect(batches[next++], ['--no-config'])));
    })
  );
  return {stories: ids.length, scans: urls.length, ...tally(findings)};
};

const result = {
  detector: readFileSync(resolve(ROOT, '.claude/skills/impeccable/scripts/VERSION'), 'utf8').trim(),
};
result.source = await scanSource();
if (storybook) result.storybook = await scanStorybook(storybook);

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : null;
for (const area of ['source', 'storybook']) {
  if (!result[area]) continue;
  console.log(`\n${area}: ${result[area].total} findings`);
  for (const [group, n] of Object.entries(result[area].groups)) {
    const was = baseline?.[area]?.groups?.[group];
    const delta =
      was === undefined
        ? ''
        : n === was
          ? ' (= baseline)'
          : ` (baseline ${was}, ${n > was ? '+' : ''}${n - was})`;
    console.log(`  ${group.padEnd(26)} ${String(n).padStart(4)}${delta}`);
  }
}

if (writeBaseline) {
  const keep = {...(baseline ?? {}), detector: result.detector};
  for (const area of ['source', 'storybook']) if (result[area]) keep[area] = result[area];
  writeFileSync(BASELINE, `${JSON.stringify(keep, null, 2)}\n`);
  console.log(`\nbaseline written to ${BASELINE}`);
}
