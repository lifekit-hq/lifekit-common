// Design scan ratchet: runs the impeccable detector over the library source and over every
// Storybook story (light + dark), then gates the result against docs/design-baseline.json.
//
//   node scripts/design-scan.mjs [--storybook <base-url>] [--filter <text>] [--write-baseline]
//
// The source scan always runs and must find nothing. The Storybook scan runs when --storybook is
// given (a base URL serving a built catalog, projects/ui/storybook-static). Every Storybook finding
// must be covered by an `accepted` entry in the baseline: a rule, the stories it applies to, an
// optional snippet match, a one-line reason and at most `max` findings per story (both themes
// together, default one per theme). Anything else fails the run, so the bar only moves one way.
//
// --filter scans only the stories whose id contains the text (for a quick local check).
// --write-baseline records the measured counts; the accepted entries are written by hand.
// A scan step that fails (exit other than 0/2, timeout, unparseable output) aborts the run with a
// non-zero exit and never writes a baseline.
import {spawn} from 'node:child_process';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DETECTOR = resolve(ROOT, '.claude/skills/impeccable/scripts/impeccable');
const BASELINE = resolve(ROOT, 'docs/design-baseline.json');
const THEMES = ['light', 'dark'];
const CONCURRENCY = 4;
const SCAN_TIMEOUT_MS = 300_000;
const FINDINGS_EXIT = 2;

const args = process.argv.slice(2);
const option = name => {
  const i = args.indexOf(name);
  if (i < 0) return null;
  const value = args[i + 1];
  if (!value || value.startsWith('--')) {
    console.error(`${name} requires a value`);
    process.exit(2);
  }
  return value;
};
const sbUrl = option('--storybook');
const storybook = sbUrl ? sbUrl.replace(/\/$/, '') : null;
const filter = option('--filter');
const writeBaseline = args.includes('--write-baseline');
if (writeBaseline && filter) {
  console.error('--write-baseline needs the full catalog; drop --filter');
  process.exit(2);
}

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
  new Promise((done, fail) => {
    const child = spawn(DETECTOR, ['detect', '--json', ...extra, ...targets], {
      cwd: ROOT,
      env: {...process.env, TMPDIR: '/tmp'},
    });
    let out = '';
    let err = '';
    child.stdout.on('data', c => (out += c));
    child.stderr.on('data', c => (err += c));
    const timer = setTimeout(() => child.kill('SIGKILL'), SCAN_TIMEOUT_MS);
    const label = `detect ${targets[0]}${targets.length > 1 ? ` (+${targets.length - 1})` : ''}`;
    child.on('error', e => {
      clearTimeout(timer);
      fail(new Error(`${label}: ${e.message}`));
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (code !== 0 && code !== FINDINGS_EXIT)
        return fail(new Error(`${label} failed (${signal ?? `exit ${code}`}): ${err.trim()}`));
      try {
        done(JSON.parse(out));
      } catch (e) {
        fail(new Error(`${label} produced unparseable output: ${e.message}`));
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

const storyOf = url => new URL(url).searchParams.get('id');
const themeOf = url => new URL(url).searchParams.get('globals')?.replace('theme:', '') ?? '';

const scanSource = async () => {
  const findings = await detect(['projects'], []);
  return {findings, ...tally(findings)};
};

const scanStorybook = async base => {
  const res = await fetch(`${base}/index.json`);
  if (!res.ok) throw new Error(`${base}/index.json responded ${res.status}`);
  const index = await res.json();
  const ids = Object.values(index.entries)
    .filter(e => e.type === 'story' && (!filter || e.id.includes(filter)))
    .map(e => e.id);
  const urls = THEMES.flatMap(theme =>
    ids.map(id => `${base}/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`)
  );
  // One URL per detector run: a multi-URL run waits only for `load` (+100ms), which fires before
  // Storybook mounts the story, so it scans half-rendered pages and misses findings at random. A
  // single-URL run waits for network idle, after the story has rendered.
  const findings = [];
  let next = 0;
  await Promise.all(
    Array.from({length: CONCURRENCY}, async () => {
      while (next < urls.length) findings.push(...(await detect([urls[next++]], ['--no-config'])));
    })
  );
  return {stories: ids.length, scans: urls.length, findings, ...tally(findings)};
};

// An entry's `stories` are story ids; a trailing `*` matches every id with that prefix.
const coversStory = (entry, story) =>
  entry.stories.some(s => (s.endsWith('*') ? story.startsWith(s.slice(0, -1)) : s === story));

const covers = (entry, story, finding) =>
  entry.rule === finding.antipattern &&
  coversStory(entry, story) &&
  (!entry.match || finding.snippet.includes(entry.match));

/** Splits Storybook findings into accepted ones and violations (unaccepted, or over `max`). */
const gate = (findings, accepted) => {
  const perStory = new Map();
  const unaccepted = [];
  const overMax = [];
  for (const f of findings) {
    const story = storyOf(f.file);
    const entry = accepted.find(e => covers(e, story, f));
    if (!entry) {
      unaccepted.push(f);
      continue;
    }
    const key = `${accepted.indexOf(entry)}|${story}`;
    const seen = (perStory.get(key) ?? 0) + 1;
    perStory.set(key, seen);
    if (seen > (entry.max ?? THEMES.length)) overMax.push(f);
  }
  const used = new Set([...perStory.keys()].map(k => Number(k.split('|')[0])));
  const unused = accepted.filter((_, i) => !used.has(i));
  return {acceptedCount: findings.length - unaccepted.length, unaccepted, overMax, unused};
};

const describe = f =>
  f.file.includes('iframe.html')
    ? `${f.antipattern}  ${storyOf(f.file)} [${themeOf(f.file)}]  ${f.snippet}`
    : `${f.antipattern}  ${f.file}:${f.line}  ${f.snippet}`;

const result = {
  detector: readFileSync(resolve(ROOT, '.claude/skills/impeccable/scripts/VERSION'), 'utf8').trim(),
};
try {
  result.source = await scanSource();
  if (storybook) result.storybook = await scanStorybook(storybook);
} catch (e) {
  console.error(`design scan failed: ${e.message}`);
  process.exit(1);
}

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : null;
const accepted = baseline?.accepted ?? [];
for (const area of ['source', 'storybook']) {
  if (!result[area]) continue;
  console.log(`\n${area}: ${result[area].total} findings`);
  for (const [group, n] of Object.entries(result[area].groups)) {
    const was = baseline?.[area]?.groups?.[group];
    const delta =
      filter || was === undefined
        ? ''
        : n === was
          ? ' (= baseline)'
          : ` (baseline ${was}, ${n > was ? '+' : ''}${n - was})`;
    console.log(`  ${group.padEnd(26)} ${String(n).padStart(4)}${delta}`);
  }
}

const violations = [...result.source.findings];
if (result.storybook) {
  const {acceptedCount, unaccepted, overMax, unused} = gate(result.storybook.findings, accepted);
  console.log(
    `\nstorybook: ${acceptedCount} accepted by ${accepted.length - unused.length} of ${accepted.length} baseline entries`
  );
  violations.push(...unaccepted, ...overMax);
  // A flaky finding (one theme, some runs) leaves its entry unused now and then: listed, not failed.
  if (!filter && unused.length)
    console.log(
      `\nunused baseline entries (fixed? remove them):\n${unused.map(e => `  ${e.rule}  ${e.stories.join(', ')}`).join('\n')}`
    );
}

if (violations.length) {
  console.log(
    `\n${violations.length} finding(s) not covered by docs/design-baseline.json:\n${violations.map(f => `  ${describe(f)}`).join('\n')}`
  );
  console.log(
    '\nFix them in the component, or justify them in the baseline with a one-line reason.'
  );
}

if (writeBaseline) {
  const keep = {...(baseline ?? {}), detector: result.detector};
  for (const area of ['source', 'storybook']) {
    if (!result[area]) continue;
    const {findings: _findings, ...counts} = result[area];
    keep[area] = counts;
  }
  keep.accepted = accepted;
  // Through the repo's Prettier config, so a rewritten baseline passes format:check as written.
  const prettier = await import('prettier');
  const options = {...(await prettier.resolveConfig(BASELINE)), filepath: BASELINE};
  writeFileSync(BASELINE, await prettier.format(JSON.stringify(keep), options));
  console.log(`\nbaseline counts written to ${BASELINE}`);
}

process.exit(violations.length ? 1 : 0);
