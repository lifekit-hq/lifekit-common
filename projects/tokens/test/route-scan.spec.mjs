/**
 * The route scan (screen/route-scan.mjs, freeze.mjs, engine.mjs): the gate that turns findings into
 * a failing route, the engine it resolves and verifies, the frozen document it hands the design
 * judge, and the tests it registers per route, size and scheme. The judge itself is the impeccable
 * binary; a stand-in script plays it here, and the golden screens of lifekit-common (the `routes`
 * job) run the real one.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {after, before, describe, it} from 'node:test';

import {
  AXE_TAGS,
  blockingAxeViolations,
  blockingDesignFindings,
  defineRouteScans,
  formatRouteScan,
  freezeScreen,
  IMPECCABLE_ENGINES,
  IMPECCABLE_VERSION,
  pinnedEnginePath,
  resolveEngine,
  SCREEN_VIEWPORTS,
  scanRoute,
  serveFrozen,
  validateExceptions,
} from '../screen/index.mjs';
import {judgeUrl} from '../screen/route-scan.mjs';
import {serializeScreen} from '../screen/freeze.mjs';
import {LOADING_SELECTOR} from '../screen/settle.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require('@playwright/test');

let browser;
let scratch;

before(async () => {
  browser = await chromium.launch();
  scratch = mkdtempSync(join(tmpdir(), 'route-scan-'));
});

after(async () => {
  await browser?.close();
  rmSync(scratch, {recursive: true, force: true});
});

const accept = (rule, extra = {}) => ({rule, routes: ['*'], reason: 'a reason', ...extra});

describe('the design gate', () => {
  const finding = (antipattern, snippet = 'div.card') => ({antipattern, snippet});

  it('fails every finding no exception covers', () => {
    const findings = [finding('low-contrast'), finding('marquee')];
    assert.deepEqual(blockingDesignFindings(findings, 'list', []), findings);
  });

  it('lets an exception cover one finding of its rule per scan, or `max`', () => {
    const findings = [finding('marquee'), finding('marquee'), finding('marquee')];
    assert.equal(blockingDesignFindings(findings, 'list', [accept('marquee')]).length, 2);
    assert.equal(blockingDesignFindings(findings, 'list', [accept('marquee', {max: 3})]).length, 0);
  });

  it('narrows an exception to a route and to a snippet', () => {
    const findings = [finding('low-contrast', 'opacity stack "Save"')];
    assert.equal(
      blockingDesignFindings(findings, 'list', [accept('low-contrast', {routes: ['form']})]).length,
      1
    );
    assert.equal(
      blockingDesignFindings(findings, 'list', [accept('low-contrast', {match: 'Delete'})]).length,
      1
    );
    assert.equal(
      blockingDesignFindings(findings, 'list', [accept('low-contrast', {match: 'Save'})]).length,
      0
    );
  });
});

describe('the axe gate', () => {
  const violation = (id, impact, ...html) => ({
    id,
    impact,
    help: `${id} help`,
    nodes: html.map((h, i) => ({html: h, target: [`#n${i}`]})),
  });

  it('fails serious and critical violations, not moderate or minor ones', () => {
    const result = blockingAxeViolations(
      [
        violation('a', 'critical', '<a>'),
        violation('b', 'serious', '<b>'),
        violation('c', 'moderate', '<c>'),
        violation('d', 'minor', '<d>'),
        violation('e', null, '<e>'),
      ],
      'list'
    );
    assert.deepEqual(
      result.map(v => v.rule),
      ['a', 'b']
    );
    assert.deepEqual(result[0], {rule: 'a', impact: 'critical', help: 'a help', nodes: ['#n0']});
  });

  it('drops the nodes an exception covers, and a violation left with none', () => {
    const violations = [
      violation(
        'label-content-name-mismatch',
        'serious',
        '<a aria-label="Search">',
        '<a aria-label="Other">'
      ),
    ];
    const some = blockingAxeViolations(violations, 'list', [
      accept('label-content-name-mismatch', {match: 'aria-label="Search"'}),
    ]);
    assert.deepEqual(some[0].nodes, ['#n1']);
    assert.deepEqual(
      blockingAxeViolations(violations, 'list', [accept('label-content-name-mismatch')]),
      []
    );
    assert.equal(
      blockingAxeViolations(violations, 'list', [
        accept('label-content-name-mismatch', {routes: ['form']}),
      ]).length,
      1
    );
  });

  it('checks WCAG 2.2 AA', () => {
    assert.ok(AXE_TAGS.includes('wcag22aa') && AXE_TAGS.includes('wcag2a'));
  });
});

describe('exceptions', () => {
  it('refuse an entry with no rule, no routes or no reason', () => {
    assert.throws(() => validateExceptions({axe: [{routes: ['*'], reason: 'r'}]}), /names no rule/);
    assert.throws(
      () => validateExceptions({impeccable: [{rule: 'x', reason: 'r'}]}),
      /names no routes/
    );
    assert.throws(
      () => validateExceptions({impeccable: [{rule: 'x', routes: ['*'], reason: '  '}]}),
      /gives no reason/
    );
  });

  it('accept a complete entry and none at all', () => {
    assert.deepEqual(validateExceptions(), {impeccable: [], axe: []});
    assert.equal(validateExceptions({axe: [accept('x')]}).axe.length, 1);
  });
});

describe('the engine', () => {
  const body = Buffer.from('#!/bin/sh\necho engine\n');
  const sha = createHash('sha256').update(body).digest('hex');

  it('pins a release binary and its sha256 for each Linux CPU', () => {
    for (const platform of ['linux-x64', 'linux-arm64']) {
      assert.match(IMPECCABLE_ENGINES[platform].sha256, /^[0-9a-f]{64}$/);
      assert.match(IMPECCABLE_ENGINES[platform].asset, /^impeccable-linux-/);
    }
  });

  it('runs the engine version the repository scans with', () => {
    const version = readFileSync(
      new URL('../../../.claude/skills/impeccable/scripts/VERSION', import.meta.url),
      'utf8'
    ).trim();
    assert.equal(IMPECCABLE_VERSION, version);
  });

  it('takes the engine option, then $IMPECCABLE_BIN, before anything is fetched', async () => {
    const never = async () => assert.fail('fetched');
    assert.equal(
      await resolveEngine({engine: '/a', env: {IMPECCABLE_BIN: '/b'}, fetchBinary: never}),
      '/a'
    );
    assert.equal(await resolveEngine({env: {IMPECCABLE_BIN: '/b'}, fetchBinary: never}), '/b');
  });

  const PIN = {'test-cpu': {asset: 'impeccable-test', sha256: sha}};
  const options = (home, fetchBinary) => ({
    env: {IMPECCABLE_HOME: join(scratch, home)},
    pins: PIN,
    platform: 'test-cpu',
    fetchBinary,
  });

  it('downloads the pinned binary once, verifies it and runs it from the cache', async () => {
    const urls = [];
    const fetchBinary = async url => (urls.push(url), body);
    const given = options('home-ok', fetchBinary);
    const path = await resolveEngine(given);
    assert.equal(path, pinnedEnginePath(given));
    assert.deepEqual(urls, [
      `https://github.com/pbakaus/impeccable/releases/download/engine-v${IMPECCABLE_VERSION}/impeccable-test`,
    ]);
    assert.equal(readFileSync(path, 'utf8'), body.toString());
    assert.equal(await resolveEngine(given), path);
    assert.equal(urls.length, 1, 'the cached binary is not fetched again');
  });

  it('refuses a download that does not match the pinned sha256, and caches nothing', async () => {
    const given = options('home-bad', async () => Buffer.from('tampered'));
    await assert.rejects(resolveEngine(given), /does not match the pinned sha256/);
    assert.throws(() => readFileSync(pinnedEnginePath(given)), /ENOENT/);
  });

  it('replaces a cached binary whose sha256 no longer matches', async () => {
    const given = options('home-stale', async () => body);
    const path = pinnedEnginePath(given);
    mkdirSync(join(path, '..'), {recursive: true});
    writeFileSync(path, 'swapped', {mode: 0o755});
    await resolveEngine(given);
    assert.equal(readFileSync(path, 'utf8'), body.toString());
  });

  it('names IMPECCABLE_BIN on a platform with no pinned binary', async () => {
    await assert.rejects(
      resolveEngine({env: {}, platform: 'plan9-mips'}),
      /no pinned impeccable engine for plan9-mips.*IMPECCABLE_BIN/
    );
  });
});

/** A stand-in for the engine: prints `json` and exits with `code`, recording its arguments. */
function fakeEngine(name, json, code) {
  const path = join(scratch, name);
  writeFileSync(
    path,
    `#!/bin/sh\nprintf '%s\\n' "$*" > "${path}.args"\nprintf '%s\\n' "$IMPECCABLE_BROWSER" > "${path}.browser"\ncat <<'EOF'\n${JSON.stringify(json)}\nEOF\nexit ${code}\n`
  );
  chmodSync(path, 0o755);
  return path;
}

describe('judgeUrl', () => {
  const viewport = {width: 390, height: 844};

  it('reads the findings of an exit 2 and passes the viewport, the url and the browser', async () => {
    const findings = [{antipattern: 'marquee', snippet: 's'}];
    const engine = fakeEngine('found', findings, 2);
    const got = await judgeUrl({engine, url: 'http://x/y', viewport, browser: '/chrome', env: {}});
    assert.deepEqual(got, findings);
    assert.equal(
      readFileSync(`${engine}.args`, 'utf8').trim(),
      'detect --json --no-config --no-advisory --viewport 390x844 http://x/y'
    );
    assert.equal(readFileSync(`${engine}.browser`, 'utf8').trim(), '/chrome');
  });

  it('keeps a browser the caller named', async () => {
    const engine = fakeEngine('named', [], 0);
    await judgeUrl({
      engine,
      url: 'http://x',
      viewport,
      browser: '/chrome',
      env: {IMPECCABLE_BROWSER: '/wrapper'},
    });
    assert.equal(readFileSync(`${engine}.browser`, 'utf8').trim(), '/wrapper');
  });

  it('is clean on exit 0 and fails the scan on any other exit', async () => {
    assert.deepEqual(
      await judgeUrl({
        engine: fakeEngine('clean', [], 0),
        url: 'u',
        viewport,
        browser: 'b',
        env: {},
      }),
      []
    );
    await assert.rejects(
      judgeUrl({engine: fakeEngine('broken', [], 1), url: 'u', viewport, browser: 'b', env: {}}),
      /design judge failed on u \(exit 1\)/
    );
  });
});

async function open(html, {size = 'desktop', url = 'http://127.0.0.1/page'} = {}) {
  const context = await browser.newContext(SCREEN_VIEWPORTS[size]);
  const page = await context.newPage();
  await page.route(url, route => route.fulfill({contentType: 'text/html', body: html}));
  await page.goto(url);
  return {page, context};
}

describe('freezing a screen', () => {
  const FIXTURE = `<!doctype html><html lang="en"><head><title>t</title>
    <style>.card{padding:8px}</style></head><body>
    <script>document.body.append(Object.assign(document.createElement('i'), {id: 'ran'}))</script>
    <main><h1>Tasks</h1>
      <input id="name" type="text"><input id="agree" type="checkbox">
      <textarea id="note"></textarea>
      <select id="pick"><option value="a">A</option><option value="b">B</option></select>
      <x-card id="host"></x-card>
    </main>
    <script>
      const sheet = new CSSStyleSheet();
      sheet.replaceSync('.inner{color:rgb(1, 2, 3)}');
      document.adoptedStyleSheets = [sheet];
      customElements.define('x-card', class extends HTMLElement {
        constructor() {
          super();
          const root = this.attachShadow({mode: 'open'});
          const own = new CSSStyleSheet();
          own.replaceSync('.inner{color:rgb(4, 5, 6)}');
          root.adoptedStyleSheets = [own];
          root.innerHTML = '<p class="inner">inside</p>';
        }
      });
    </script></body></html>`;

  it('writes the settled screen out as a static document', async () => {
    const {page, context} = await open(FIXTURE);
    try {
      await page.fill('#name', 'Rent');
      await page.check('#agree');
      await page.fill('#note', 'Due on the 1st');
      await page.selectOption('#pick', 'b');
      const html = await freezeScreen(page);

      assert.doesNotMatch(html, /<script/, 'no script is left to change the document');
      assert.match(html, /^<!DOCTYPE html>/);
      assert.match(html, /<h1>Tasks<\/h1>/);

      // The frozen document renders what the live page did, shadow roots and form state included.
      const frozen = await serveFrozen(html, page.url(), {
        fetchImpl: async () => new Response('', {status: 404}),
      });
      try {
        const copy = await context.newPage();
        await copy.goto(frozen.url);
        assert.equal(await copy.inputValue('#name'), 'Rent');
        assert.equal(await copy.isChecked('#agree'), true);
        assert.equal(await copy.inputValue('#note'), 'Due on the 1st');
        assert.equal(await copy.inputValue('#pick'), 'b');
        assert.equal(await copy.locator('#ran').count(), 1, 'the page script did not run again');
        const colour = selector =>
          copy.evaluate(sel => {
            const el =
              sel === 'host'
                ? document.querySelector('x-card').shadowRoot.querySelector('.inner')
                : document.querySelector(sel);
            return getComputedStyle(el).color;
          }, selector);
        assert.equal(
          await colour('host'),
          'rgb(4, 5, 6)',
          'the shadow root keeps its adopted sheet'
        );
      } finally {
        await frozen.close();
      }
    } finally {
      await context.close();
    }
  });

  it('retries a screen that still shows a skeleton and never judges it', async () => {
    const html = `<!doctype html><title>t</title><main><h1>List</h1><div id="slot"><cmn-skeleton style="display:block;height:20px"></cmn-skeleton></div></main>
      <script>setTimeout(() => { document.getElementById('slot').textContent = 'rows'; }, 1200);</script>`;
    const {page, context} = await open(html);
    try {
      const frozen = await freezeScreen(page, {timeout: 10_000});
      assert.doesNotMatch(frozen, /cmn-skeleton/);
      assert.match(frozen, /rows/);
    } finally {
      await context.close();
    }
  });

  it('fails a screen that never settles, naming the page', async () => {
    const html = `<!doctype html><title>t</title><main><cmn-skeleton style="display:block;height:20px"></cmn-skeleton></main>`;
    const {page, context} = await open(html);
    try {
      await assert.rejects(freezeScreen(page, {timeout: 600}), /Timeout|never settled/);
    } finally {
      await context.close();
    }
  });

  it('reports a loading marker in the serialised document', async () => {
    const {page, context} = await open(
      '<!doctype html><title>t</title><div aria-busy="true" style="height:10px">x</div>'
    );
    try {
      const {loading} = await page.evaluate(serializeScreen, LOADING_SELECTOR);
      assert.equal(loading, true);
    } finally {
      await context.close();
    }
  });

  it('serves the document at the page address and passes every other path to the app', async () => {
    const app = createServer((request, response) => {
      response.writeHead(200, {'content-type': 'text/css'}).end(`/* ${request.url} */`);
    });
    await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${app.address().port}`;
    const frozen = await serveFrozen(
      `<!doctype html><link rel="stylesheet" href="${origin}/a.css"><p>frozen</p>`,
      `${origin}/console/goals?x=1#top`
    );
    try {
      const doc = await fetch(frozen.url);
      assert.equal(new URL(frozen.url).pathname + new URL(frozen.url).search, '/console/goals?x=1');
      const text = await doc.text();
      assert.match(text, /<p>frozen<\/p>/);
      assert.match(text, /href="\/a\.css"/, 'absolute links to the app follow the document');
      const asset = await fetch(new URL('/a.css', frozen.url));
      assert.equal(asset.headers.get('content-type'), 'text/css');
      assert.equal(await asset.text(), '/* /a.css */');
      assert.equal((await fetch(frozen.url, {method: 'POST'})).status, 405);
    } finally {
      await frozen.close();
      await new Promise(resolve => app.close(resolve));
    }
  });

  it('answers 502 for an asset the app cannot serve', async () => {
    const frozen = await serveFrozen('<p>x</p>', 'http://127.0.0.1/page', {
      fetchImpl: async () => Promise.reject(new Error('down')),
    });
    try {
      assert.equal((await fetch(new URL('/missing.css', frozen.url))).status, 502);
    } finally {
      await frozen.close();
    }
  });
});

describe('scanRoute', () => {
  const PAGE =
    '<!doctype html><html lang="en"><head><title>t</title></head><body><main><h1>Tasks</h1><button>Go</button><img src="/x.png"></main></body></html>';

  async function scan(engineFindings, code, options = {}) {
    const {page, context} = await open(PAGE, {url: 'http://127.0.0.1/page'});
    try {
      return await scanRoute(page, {
        route: 'tasks',
        size: 'phone',
        engine: fakeEngine(`scan-${Math.random()}`, engineFindings, code),
        ...options,
      });
    } finally {
      await context.close();
    }
  }

  it('reports the judge’s findings and axe’s violations of the settled page', async () => {
    const result = await scan([{antipattern: 'marquee', snippet: 'div.x'}], 2);
    assert.deepEqual(result.design, ['marquee: div.x']);
    assert.equal(result.route, 'tasks');
    // The image has no alternative text: a critical axe violation, found on the live page.
    assert.deepEqual(
      result.axe.map(v => v.rule),
      ['image-alt']
    );
    const report = formatRouteScan(result);
    assert.match(report, /tasks \(.*\): 1 design and 1 accessibility finding/);
    assert.match(report, /design {2}marquee: div\.x/);
    assert.match(report, /axe {5}image-alt \[critical\]/);
  });

  it('is clean when the judge and axe find nothing the exceptions leave', async () => {
    const result = await scan([{antipattern: 'marquee', snippet: 'div.x'}], 2, {
      exceptions: {
        impeccable: [accept('marquee', {routes: ['tasks']})],
        axe: [accept('image-alt', {match: 'x.png'})],
      },
    });
    assert.deepEqual(result.design, []);
    assert.deepEqual(result.axe, []);
  });
});

describe('defineRouteScans', () => {
  function fakePlaywright() {
    const registered = [];
    const describes = [];
    let scope = null;
    const test = (title, body) => registered.push({title, body, scope});
    test.describe = (title, define) => {
      scope = {title, use: {}};
      describes.push(scope);
      define();
      scope = null;
    };
    test.use = options => Object.assign(scope.use, options);
    test.setTimeout = () => undefined;
    const expect = () => ({toEqual: () => undefined});
    return {test, expect, registered, describes};
  }

  const route = (name, extra = {}) => ({name, url: `http://127.0.0.1/${name}`, ...extra});

  it('registers one test per route, scheme and size under a describe per size', () => {
    const fake = fakePlaywright();
    defineRouteScans(fake, {routes: [route('list'), route('form')]});
    assert.deepEqual(
      fake.describes.map(d => d.title),
      ['route scan phone', 'route scan desktop']
    );
    assert.deepEqual(
      fake.registered.filter(r => r.scope.title === 'route scan phone').map(r => r.title),
      ['list light', 'form light', 'list dark', 'form dark']
    );
    assert.equal(fake.registered.length, 8);
  });

  it('sets each size’s viewport and a fixed zone and locale', () => {
    const fake = fakePlaywright();
    defineRouteScans(fake, {routes: [route('list')]});
    const [phone, desktop] = fake.describes;
    assert.deepEqual(phone.use.viewport, {width: 390, height: 844});
    assert.equal(phone.use.isMobile, true);
    assert.deepEqual(desktop.use.viewport, {width: 1280, height: 800});
    assert.equal(desktop.use.timezoneId, 'UTC');
    assert.equal(desktop.use.locale, 'en-US');
  });

  it('narrows the matrix with sizes and schemes', () => {
    const fake = fakePlaywright();
    defineRouteScans(fake, {routes: [route('list')], sizes: ['phone'], schemes: ['dark']});
    assert.deepEqual(
      fake.registered.map(r => `${r.scope.title}/${r.title}`),
      ['route scan phone/list dark']
    );
  });

  it('refuses duplicate routes, unknown sizes and exceptions that name a route that is not there', () => {
    const fake = () => fakePlaywright();
    assert.throws(
      () => defineRouteScans(fake(), {routes: [route('a'), route('a')]}),
      /two routes are named "a"/
    );
    assert.throws(
      () => defineRouteScans(fake(), {routes: [route('a')], sizes: ['tablet']}),
      /unknown size "tablet"/
    );
    assert.throws(
      () =>
        defineRouteScans(fake(), {
          routes: [route('a')],
          exceptions: {axe: [accept('x', {routes: ['b']})]},
        }),
      /names unknown route "b"/
    );
    assert.throws(
      () =>
        defineRouteScans(fake(), {
          routes: [route('a')],
          exceptions: {axe: [{rule: 'x', routes: ['*'], reason: ''}]},
        }),
      /gives no reason/
    );
  });

  it('runs a route: prepare, open, ready, then the scan with the variant', async () => {
    const calls = [];
    const fake = fakePlaywright();
    const verdicts = [];
    fake.expect = (value, message) => ({
      toEqual: expected => verdicts.push({value, message, expected}),
    });
    const {page, context} = await open('<!doctype html><title>t</title><main><h1>x</h1></main>', {
      url: 'http://127.0.0.1/list',
    });
    const engine = fakeEngine('define', [], 0);
    defineRouteScans(fake, {
      routes: [
        route('list', {
          url: ({scheme}) => `http://127.0.0.1/list?scheme=${scheme}`,
          prepare: (_page, variant) => calls.push(`prepare ${variant.size} ${variant.scheme}`),
          ready: (_page, variant) => calls.push(`ready ${variant.size} ${variant.scheme}`),
        }),
      ],
      sizes: ['phone'],
      schemes: ['dark'],
      engine,
    });
    try {
      await page.route('http://127.0.0.1/list?scheme=dark', r =>
        r.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><title>t</title><main><h1>x</h1></main>',
        })
      );
      await fake.registered[0].body({page});
      assert.deepEqual(calls, ['prepare phone dark', 'ready phone dark']);
      assert.equal(page.url(), 'http://127.0.0.1/list?scheme=dark');
      assert.deepEqual(verdicts[0].expected, {design: [], axe: []});
      assert.match(verdicts[0].message, /^list \(/);
    } finally {
      await context.close();
    }
  });
});
