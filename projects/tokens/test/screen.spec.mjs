/**
 * The screen-composition check (screen/): every rule fires on a page built to break it and stays
 * quiet on the same list composed as the list template composes it, at the phone and the desktop
 * size. The check runs in a real Chromium, as an app's e2e runs it.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {after, before, describe, it} from 'node:test';

import {parseScreenArgs} from '../screen/cli.mjs';
import {
  checkScreen,
  formatScreen,
  inspectScreen,
  SCREEN_RULES,
  SCREEN_VIEWPORTS,
} from '../screen/index.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require('@playwright/test');

const FIXTURES = new URL('./fixtures/screen/', import.meta.url);
const FAILING = readFileSync(new URL('failing.html', FIXTURES), 'utf8');
const PASSING = readFileSync(new URL('passing.html', FIXTURES), 'utf8');
const OVERVIEW = readFileSync(new URL('overview.html', FIXTURES), 'utf8');
const BIN = fileURLToPath(new URL('../bin/lifekit-chrome-check.mjs', import.meta.url));
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const ALL_RULES = SCREEN_RULES.map(rule => rule.id);
const SKELETON_MS = 300;

let browser;

async function open(html, size = 'desktop') {
  const context = await browser.newContext(SCREEN_VIEWPORTS[size]);
  const page = await context.newPage();
  await page.setContent(html);
  return {page, close: () => context.close()};
}

async function inspect(html, size, options) {
  const {page, close} = await open(html, size);
  try {
    return await checkScreen(page, options);
  } finally {
    await close();
  }
}

const rulesOf = result => [...new Set(result.findings.map(finding => finding.rule))].sort();
const sorted = ids => [...ids].sort();

before(async () => {
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
});

describe('screen rules', () => {
  it('ties every rule to a sentence it enforces, under a unique id and name', () => {
    assert.equal(new Set(ALL_RULES).size, SCREEN_RULES.length);
    assert.equal(new Set(SCREEN_RULES.map(rule => rule.name)).size, SCREEN_RULES.length);
    for (const rule of SCREEN_RULES) assert.match(rule.says, /^(DESIGN\.md|HIG) /, rule.id);
  });

  it('reports every rule on the failing page at 1280', async () => {
    const result = await inspect(FAILING, 'desktop');
    assert.deepEqual(rulesOf(result), sorted(ALL_RULES), formatScreen(result));
    assert.equal(result.template, false);
  });

  it('measures what the owner saw: the 0px title gap, the 16px edge, the 44/40 pair, the 900px input', async () => {
    const {findings} = await inspect(FAILING, 'desktop');
    const message = rule => findings.filter(finding => finding.rule === rule).map(f => f.message);
    assert.ok(
      message('C2').some(text => /: 0px$/.test(text)),
      message('C2').join()
    );
    assert.ok(
      message('C1').some(text => text.includes('16px vs title 32px')),
      message('C1').join()
    );
    assert.ok(
      message('C4').some(text => /44px next to .* 40px/.test(text)),
      message('C4').join()
    );
    assert.ok(
      message('C5').some(text => text.startsWith('input 900px')),
      message('C5').join()
    );
    assert.ok(
      message('C9').some(text => text.startsWith('3 bordered text buttons')),
      message('C9').join()
    );
    assert.ok(
      message('C7').some(text => text.includes('To buy · 6')),
      message('C7').join()
    );
  });

  for (const size of ['phone', 'desktop']) {
    it(`passes the list composed as the list template composes it, at ${size}`, async () => {
      const result = await inspect(PASSING, size);
      assert.deepEqual(result.findings, [], formatScreen(result));
      assert.equal(result.template, true);
      assert.equal(result.kind, 'list');
    });
  }

  it('skips the rules an app ignores', async () => {
    const result = await inspect(FAILING, 'desktop', {ignore: ['C0', 'C6']});
    assert.ok(!rulesOf(result).includes('C0'));
    assert.ok(!rulesOf(result).includes('C6'));
    assert.ok(rulesOf(result).includes('C1'));
  });
});

describe('template-aware one left edge (C1)', () => {
  const template = (column, extra = '') =>
    PASSING.replace('<div data-cmn-page-column>', `<div data-cmn-page-column>${column}`).replace(
      '</main>',
      `${extra}</main>`
    );

  it('reports a block that starts off its column', async () => {
    const html = template('<p style="margin-left: 24px">Indented on its own</p>');
    const {findings} = await inspect(html, 'desktop');
    assert.deepEqual(
      findings.map(finding => finding.rule),
      ['C1']
    );
    assert.match(findings[0].message, /vs its column/);
  });

  it('reports a notice off the page edge', async () => {
    const html = PASSING.replace(
      '<div class="notice">',
      '<div class="notice" style="margin-left: -32px">'
    );
    const {findings} = await inspect(html, 'desktop');
    assert.deepEqual(
      findings.map(finding => finding.rule),
      ['C1']
    );
    assert.match(findings[0].message, /off the page's columns/);
  });

  it('holds a list page to its one column', async () => {
    const html = PASSING.replace(
      '</h1>',
      '</h1><div data-cmn-page-column style="max-width: 200px"><p>A second column</p></div>'
    );
    const {findings} = await inspect(html, 'desktop');
    assert.ok(
      findings.some(finding =>
        /a list page has 1 column\(s\); this one has 2/.test(finding.message)
      )
    );
  });

  for (const kind of ['detail', 'form', 'settings']) {
    it(`holds a ${kind} page to its one column`, async () => {
      const page = PASSING.replace('data-cmn-page="list"', `data-cmn-page="${kind}"`);
      const clean = await inspect(page, 'desktop');
      assert.equal(clean.kind, kind);
      assert.deepEqual(clean.findings, [], formatScreen(clean));
      const html = page.replace(
        '</h1>',
        '</h1><div data-cmn-page-column style="max-width: 200px"><p>A second column</p></div>'
      );
      const {findings} = await inspect(html, 'desktop');
      assert.ok(
        findings.some(finding =>
          new RegExp(`a ${kind} page has 1 column\\(s\\); this one has 2`).test(finding.message)
        ),
        findings.map(finding => finding.message).join()
      );
    });
  }

  it('accepts a declared second column for a kind that is not held to a count', async () => {
    const html = PASSING.replace('data-cmn-page="list"', 'data-cmn-page="board"').replace(
      '</h1>',
      '</h1><div data-cmn-page-column style="max-width: 200px"><p>A second column</p></div>'
    );
    const result = await inspect(html, 'desktop');
    assert.equal(result.kind, 'board');
    assert.deepEqual(result.findings, [], formatScreen(result));
  });

  it('reads the kind passed in over the one the page declares', async () => {
    const result = await inspect(PASSING, 'desktop', {kind: 'list'});
    assert.equal(result.kind, 'list');
  });

  it('runs as a plain function inside the page', async () => {
    const {page, close} = await open(PASSING);
    try {
      const result = await page.evaluate(inspectScreen, {});
      assert.deepEqual(result.findings, []);
    } finally {
      await close();
    }
  });
});

describe('the overview kind and its rail (C1)', () => {
  const messages = result => result.findings.map(finding => `${finding.rule} ${finding.message}`);

  for (const size of ['phone', 'desktop']) {
    it(`accepts the rail beside the main column as the overview's second column, at ${size}`, async () => {
      const result = await inspect(OVERVIEW, size);
      assert.equal(result.kind, 'overview');
      assert.deepEqual(result.findings, [], formatScreen(result));
    });
  }

  it('lays the rail beside the main column at 1280 and under it on the phone', async () => {
    for (const [size, beside] of [
      ['desktop', true],
      ['phone', false],
    ]) {
      const {page, close} = await open(OVERVIEW, size);
      try {
        const [main, rail] = await page
          .locator('[data-cmn-page-column]')
          .evaluateAll(columns => columns.map(column => column.getBoundingClientRect().toJSON()));
        assert.equal(rail.left > main.right, beside, size);
        assert.equal(rail.left === main.left, !beside, size);
      } finally {
        await close();
      }
    }
  });

  it('reads the same rail as a stray second column on a single-column kind', async () => {
    const html = OVERVIEW.replace('data-cmn-page="overview"', 'data-cmn-page="detail"');
    const result = await inspect(html, 'desktop');
    assert.ok(
      messages(result).includes('C1 a detail page has 1 column(s); this one has 2'),
      messages(result).join('\n')
    );
  });

  it('accepts an overview without a rail, its main column the frame wide', async () => {
    const html = OVERVIEW.replace(
      /<div data-cmn-page-column="rail">[\s\S]*?<\/section>\s*<\/div>/,
      ''
    );
    assert.ok(!html.includes('data-cmn-page-column="rail"'));
    const result = await inspect(html, 'desktop');
    assert.deepEqual(result.findings, [], formatScreen(result));
  });

  for (const [where, column] of [
    ['rail', '<div data-cmn-page-column="rail">'],
    ['main column', '<div data-cmn-page-column>'],
  ]) {
    it(`refuses a block in the ${where} that starts off its column`, async () => {
      const html = OVERVIEW.replace(
        column,
        `${column}<p style="margin-left: 24px">Indented on its own</p>`
      );
      const result = await inspect(html, 'desktop');
      assert.deepEqual(
        result.findings.map(finding => finding.rule),
        ['C1'],
        formatScreen(result)
      );
      assert.match(result.findings[0].message, /vs its column/);
    });
  }

  it('refuses a third column', async () => {
    const html = OVERVIEW.replace(
      '<div class="columns">',
      '<div class="columns"><div data-cmn-page-column="aside"><p>A third column</p></div>'
    );
    const result = await inspect(html, 'desktop');
    assert.ok(
      messages(result).includes('C1 an overview page has 2 column(s); this one has 3'),
      messages(result).join('\n')
    );
  });

  it('refuses a second column the kind does not name', async () => {
    const html = OVERVIEW.replace('data-cmn-page-column="rail"', 'data-cmn-page-column="aside"');
    const result = await inspect(html, 'desktop');
    assert.ok(
      messages(result).includes(
        'C1 an overview page has the columns main, rail; this one has main, aside'
      ),
      messages(result).join('\n')
    );
  });

  it('refuses a rail with no main column', async () => {
    const html = OVERVIEW.replace(
      '<div data-cmn-page-column>',
      '<div data-cmn-page-column="rail">'
    );
    const result = await inspect(html, 'desktop');
    assert.ok(
      messages(result).includes(
        'C1 an overview page has the columns main, rail; this one has rail, rail'
      ),
      messages(result).join('\n')
    );
  });

  it('measures stacked surfaces within a column, past a rail surface that sits between them', async () => {
    // The main column's list card 2px under the stat grid, with no heading between them; sorted
    // by top, the rail's first card falls between the two.
    const html = OVERVIEW.replace('<h2>Due today · 2</h2>', '').replace(
      '<div data-cmn-page-column>',
      '<div data-cmn-page-column style="gap: 2px">'
    );
    const result = await inspect(html, 'desktop');
    assert.deepEqual(
      result.findings.map(finding => finding.rule),
      ['C3'],
      formatScreen(result)
    );
    assert.match(result.findings[0].message, /^2px between div\.stat .* and div\.card/);
  });
});

describe('checkScreen settling', () => {
  it('judges the page after its skeleton is gone, not the loading state', async () => {
    const loading = PASSING.replace(
      '<main>',
      `<main><div class="cmn-skel" style="height:40px;border:1px solid #7d8c93"></div>`
    ).replace(
      '</body>',
      `<script>
          const skel = document.querySelector('.cmn-skel');
          skel.setAttribute('aria-busy', 'true');
          setTimeout(() => skel.remove(), ${SKELETON_MS});
        </script></body>`
    );
    const result = await inspect(loading, 'desktop');
    assert.deepEqual(result.findings, [], formatScreen(result));
  });

  it('formats one line per finding under a header naming the screen', async () => {
    const result = await inspect(FAILING, 'desktop', {ignore: ALL_RULES.filter(id => id !== 'C5')});
    const lines = formatScreen(result).split('\n');
    assert.match(lines[0], /\[no template\]: 1 composition finding\(s\)$/);
    assert.match(lines[1], /^ {2}C5 stretched-input: input 900px wide/);
  });
});

describe('lifekit-chrome-check screen', () => {
  const run = (...args) =>
    spawnSync(process.execPath, [BIN, 'screen', ...args], {cwd: ROOT, encoding: 'utf8'});
  const url = name => new URL(name, FIXTURES).href;

  it('exits 1 and lists the findings for a failing screen', () => {
    const result = run('--viewport', 'desktop', url('failing.html'));
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /\[desktop\] \[no template\]: \d+ composition finding\(s\)/);
    assert.match(result.stderr, /C2 title-clearance/);
  });

  it('exits 0 for a clean screen at both sizes', () => {
    const result = run(url('passing.html'));
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /\[phone\] \[list template\]: 0 composition finding/);
    assert.match(result.stdout, /\[desktop\] \[list template\]: 0 composition finding/);
  });

  it('exits 2 on misuse', () => {
    assert.equal(run().status, 2);
    assert.equal(run('--ignore', 'C99', url('passing.html')).status, 2);
  });

  it('parses sizes, the colour scheme and the rules to skip', () => {
    const options = parseScreenArgs([
      '--viewport',
      'phone',
      '--color-scheme',
      'dark',
      '--ignore',
      'C6, C9',
      '--settle-timeout',
      '5000',
      'http://a',
    ]);
    assert.deepEqual(options.viewports, ['phone']);
    assert.equal(options.colorScheme, 'dark');
    assert.deepEqual(options.ignore, ['C6', 'C9']);
    assert.equal(options.timeout, 5000);
    assert.throws(() => parseScreenArgs(['--color-scheme', 'sepia', 'http://a']), /light or dark/);
    assert.throws(() => parseScreenArgs(['--settle-timeout', '0', 'http://a']), /positive/);
    assert.throws(() => parseScreenArgs([]), /at least one URL/);
    assert.deepEqual(parseScreenArgs(['-h']), {help: true});
  });
});
