import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {after, before, describe, it} from 'node:test';

import {
  checkDrift,
  DRIFT_RULES,
  RADIUS_SCALE_PX,
  scanSource,
  TEXT_RAMP_PX,
} from '../drift/index.mjs';

const BIN = fileURLToPath(new URL('../bin/lifekit-chrome-check.mjs', import.meta.url));

const scan = (file, text) => scanSource(file, text).map(({rule, line}) => `${rule}:${line}`);
const clean = (file, text) => assert.deepEqual(scanSource(file, text), []);

describe('contract', () => {
  it('reads the ramp and the radius scale from the package', () => {
    assert.deepEqual(TEXT_RAMP_PX, [12, 14, 16, 18, 20, 24, 30, 36]);
    assert.deepEqual(RADIUS_SCALE_PX, [3, 6, 8, 9999]);
  });
});

describe('font-family', () => {
  it('flags a literal stack in CSS, a Lit css template, a TS key and a chart font', () => {
    assert.deepEqual(scan('a.css', 'a {\n  font-family: Inter, sans-serif;\n}'), ['font-family:2']);
    assert.deepEqual(scan('a.scss', ".a { font-family: 'Segoe UI', sans-serif; }"), [
      'font-family:1',
    ]);
    assert.deepEqual(scan('a.ts', 'const s = css`\n  :host {\n    font-family: Inter;\n  }\n`;'), [
      'font-family:3',
    ]);
    assert.deepEqual(scan('a.ts', "const o = {fontFamily: 'Roboto'};"), ['font-family:1']);
    assert.deepEqual(scan('a.ts', "const o = {font: {family: 'Arial', size: 12}};"), [
      'font-family:1',
    ]);
    assert.deepEqual(scan('a.html', `<p class="font-['Inter']">x</p>`), ['font-family:1']);
  });

  it('accepts tokens, inherit, interpolations and @font-face', () => {
    clean('a.css', 'a { font-family: var(--font-sans); }');
    clean('a.css', 'a { font-family: var(--font-mono), monospace; }');
    clean('a.css', 'a { font-family: inherit; font: inherit; }');
    clean('a.css', '@font-face { font-family: "IBM Plex Sans Variable"; src: url(a.woff2); }');
    clean('a.ts', 'const s = css`a { font-family: ${family}; }`;');
    clean('a.ts', 'const o = {fontFamily: `${family}`, font: {family: fontFamily(tokens)}};');
    clean('a.html', '<p class="font-sans font-mono font-[600]">x</p>');
  });
});

describe('color', () => {
  it('flags hex and colour functions that match no token', () => {
    assert.deepEqual(scan('a.css', 'a {\n  color: #123456;\n}'), ['color:2']);
    assert.deepEqual(scan('a.css', 'a { background: rgb(0 0 0 / 0.5); }'), ['color:1']);
    assert.deepEqual(scan('a.css', 'a { color: var(--color-text-primary, #123456); }'), [
      'color:1',
    ]);
    assert.deepEqual(
      scan('a.css', 'a { background: linear-gradient(#abcdef, hsl(10 20% 30%)); }'),
      ['color:1', 'color:1']
    );
    assert.deepEqual(scan('a.ts', "const c = ['#10b981', `rgba(1, 2, 3, 0.4)`];"), [
      'color:1',
      'color:1',
    ]);
    assert.deepEqual(scan('a.ts', 'const s = css`\n  a {\n    color: #112233;\n  }\n`;'), [
      'color:3',
    ]);
  });

  it('accepts token values, tokens, custom-property definitions and non-colours', () => {
    clean(
      'a.css',
      'a { color: #175a6d; background: #FFF; border-color: var(--color-border-default); }'
    );
    clean(
      'a.css',
      'a { color: rgb(var(--rgb) / 0.5); box-shadow: 0 0 0 1px var(--color-border-focus); }'
    );
    clean('a.css', ':root { --brand: #123456; --shadow: 0 1px rgba(0, 0, 0, 0.2); }');
    clean('a.css', 'a { background: url("data:image/svg+xml,%3Csvg fill=\'%23abcdef\'/%3E"); }');
    clean('a.css', 'a { color: currentColor; background: transparent; }');
    clean('a.ts', "const s = css`:host { --accent: #123456; }`; const u = 'a#bad';");
    clean('a.ts', "const g = `url(#fade)`; const html = '&#8212;'; const n = this.#abcd;");
    clean('a.ts', 'const v = color(); const w = `[style.color]="color()"`;');
    clean('a.ts', 'const t = `color(${x})`;');
  });

  it('leaves templates alone', () => {
    clean('a.html', '<p style="color: #123456">x</p><i class="bg-[#123456]"></i>');
    clean('a.css', '/* #123456 */ a { color: var(--c); } // rgb(0 0 0)');
  });

  it('flags colour inside an inline template string in TS', () => {
    assert.deepEqual(scan('a.ts', 'const t = `<i class="bg-[#123456]"></i>`;'), ['color:1']);
  });
});

describe('text-size', () => {
  it('flags a size below 12px, and a size off the ramp', () => {
    assert.deepEqual(scan('a.css', 'a { font-size: 11px; }'), ['text-size:1']);
    assert.deepEqual(scan('a.css', 'a { font-size: 0.6875rem; }'), ['text-size:1']);
    assert.deepEqual(scan('a.css', 'a { font-size: 15px; }'), ['text-size:1']);
    assert.deepEqual(scan('a.css', 'a { font-size: 0.9rem; }'), ['text-size:1']);
    assert.deepEqual(scan('a.css', 'a { font-size: 1.3em; }'), ['text-size:1']);
    assert.deepEqual(scan('a.css', 'a { font-size: large; }'), ['text-size:1']);
    assert.deepEqual(scan('a.html', '<p class="text-[10px] md:text-[13px]">x</p>'), [
      'text-size:1',
      'text-size:1',
    ]);
    assert.deepEqual(scan('a.html', '<p style="font-size: 10px">x</p>'), ['text-size:1']);
    assert.deepEqual(scan('a.html', '<p\n  style="color: var(--c);\n font-size: 10px">x</p>'), [
      'text-size:3',
    ]);
    assert.deepEqual(scan('a.ts', 'const t = `\n<p style="font-size: 10px">x</p>`;'), [
      'text-size:2',
    ]);
    assert.deepEqual(scan('a.ts', 'const o = {fontSize: 11, bubble: {fontSize: "0.9rem"}};'), [
      'text-size:1',
      'text-size:1',
    ]);
    assert.deepEqual(scan('a.ts', 'const o = {font: {family: f, size: 11}};'), ['text-size:1']);
  });

  it('accepts ramp sizes, tokens and relative resets', () => {
    clean('a.css', 'a { font-size: 12px; } b { font-size: 0.875rem; } c { font-size: 1.125rem; }');
    clean(
      'a.css',
      'a { font-size: var(--text-sm); } b { font-size: inherit; } c { font-size: 100%; }'
    );
    clean('a.css', 'a { font-size: clamp(1rem, var(--fluid), 2rem); }');
    clean(
      'a.html',
      '<p class="text-cmn-xs text-[14px] text-[color:var(--x)] text-[#123456] text-[length:var(--s)]">x</p>'
    );
    clean('a.ts', 'const o = {fontSize: 14, other: {fontSize: `${n}px`}, font: {size: 12}};');
    clean('a.ts', 'const label = "font size 11"; const o = {size: 11};');
  });
});

describe('radius', () => {
  it('flags a radius off the scale', () => {
    assert.deepEqual(scan('a.css', 'a { border-radius: 10px; }'), ['radius:1']);
    assert.deepEqual(scan('a.css', 'a { border-top-left-radius: 0.375rem 5px; }'), ['radius:1']);
    assert.deepEqual(scan('a.css', 'a { border-start-end-radius: 12px; }'), ['radius:1']);
    assert.deepEqual(scan('a.html', '<i class="rounded-[10px] rounded-t-[4px]"></i>'), [
      'radius:1',
      'radius:1',
    ]);
    assert.deepEqual(scan('a.ts', "const o = {borderRadius: '10px'};"), ['radius:1']);
  });

  it('accepts the scale, pills, circles, none and tokens', () => {
    clean(
      'a.css',
      'a { border-radius: 3px; } b { border-radius: 6px 0 8px 0.5rem; } c { border-radius: 9999px; }'
    );
    clean(
      'a.css',
      'a { border-radius: 0.375rem; } b { border-radius: 50%; } c { border-radius: 0; }'
    );
    clean(
      'a.css',
      'a { border-radius: var(--radius-md); } b { border-radius: calc(var(--radius-lg) - 2px); }'
    );
    clean(
      'a.html',
      '<i class="rounded-cmn-md rounded-full rounded-[var(--radius-lg)] rounded-[8px]"></i>'
    );
    clean('a.ts', "const o = {borderRadius: 'var(--radius-lg)', other: {borderRadius: '8px'}};");
  });
});

describe('root-font-size', () => {
  it('flags a font-size on html and :root', () => {
    assert.deepEqual(scan('a.scss', 'html {\n  font-size: 14px;\n}'), ['root-font-size:2']);
    assert.deepEqual(scan('a.css', ':root { font-size: 87.5%; }'), ['root-font-size:1']);
    assert.deepEqual(scan('a.css', 'html[data-density="compact"], body { font-size: 0.875rem; }'), [
      'root-font-size:1',
    ]);
    assert.deepEqual(scan('a.css', '@media (min-width: 40rem) { html { font-size: 18px; } }'), [
      'root-font-size:1',
    ]);
    assert.deepEqual(scan('a.ts', 'document.documentElement.style.fontSize = "14px";'), [
      'root-font-size:1',
    ]);
  });

  it('accepts the 16px contract and other selectors', () => {
    clean(
      'a.css',
      'html { font-size: 100%; } :root { font-size: 16px; } html { font-size: 1rem; }'
    );
    clean(
      'a.css',
      'body { font-size: 14px; } html body { font-size: 14px; } .html { font-size: 14px; }'
    );
    clean('a.css', 'html { color: var(--c); background: var(--b); }');
  });
});

describe('layout-transition', () => {
  it('flags a transition on width or height', () => {
    assert.deepEqual(scan('a.css', 'a { transition: width 200ms ease; }'), ['layout-transition:1']);
    assert.deepEqual(scan('a.css', 'a { transition: opacity 1s, max-height 1s; }'), [
      'layout-transition:1',
    ]);
    assert.deepEqual(scan('a.css', 'a { transition-property: min-width; }'), [
      'layout-transition:1',
    ]);
    assert.deepEqual(
      scan('a.html', '<i class="transition-[width] md:transition-[height,opacity]"></i>'),
      ['layout-transition:1', 'layout-transition:1']
    );
    assert.deepEqual(scan('a.ts', "const o = {transition: 'height 1s'};"), ['layout-transition:1']);
    assert.deepEqual(scan('a.ts', "const c = 'transition-[width] duration-200';"), [
      'layout-transition:1',
    ]);
  });

  it('accepts transform, opacity, colours, all and lookalikes', () => {
    clean('a.css', 'a { transition: transform 200ms, opacity 200ms; } b { transition: all 1s; }');
    clean(
      'a.css',
      'a { transition: border-width 1s, stroke-width 1s, line-height 1s, outline-width 1s; }'
    );
    clean('a.css', 'a { width: 4rem; height: 2rem; }');
    clean(
      'a.html',
      '<i class="transition-colors transition-[opacity] transition-transform w-[4rem]"></i>'
    );
  });
});

describe('scanning', () => {
  it('reports each problem once, in line order, with the file', () => {
    const text = 'a {\n  border-radius: 10px;\n  font-size: 11px;\n}\n';
    assert.deepEqual(
      scanSource('x/a.css', text).map(({file, line, rule}) => [file, line, rule]),
      [
        ['x/a.css', 2, 'radius'],
        ['x/a.css', 3, 'text-size'],
      ]
    );
  });

  it('survives comments, strings with braces and unterminated quotes', () => {
    clean(
      'a.scss',
      '// font-size: 11px\n/* border-radius: 10px */\na { content: "}{;"; color: var(--c); }'
    );
    clean('a.ts', "const re = /['\"]/g;\n// font-size: 11px\nconst s = 'it\\'s';");
  });

  it('names every rule', () => {
    assert.deepEqual(DRIFT_RULES, [
      'font-family',
      'color',
      'text-size',
      'radius',
      'root-font-size',
      'layout-transition',
    ]);
  });
});

describe('lifekit-chrome-check drift', () => {
  let dir;
  const run = (...args) =>
    spawnSync(process.execPath, [BIN, 'drift', ...args], {cwd: dir, encoding: 'utf8'});

  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'lifekit-drift-'));
    mkdirSync(join(dir, 'src'));
    mkdirSync(join(dir, 'src', 'node_modules'));
    mkdirSync(join(dir, 'ok'));
    writeFileSync(join(dir, 'src', 'a.css'), 'a {\n  font-size: 11px;\n}\n');
    writeFileSync(join(dir, 'src', 'a.spec.ts'), "const x = '#123456';");
    writeFileSync(join(dir, 'src', 'a.stories.ts'), "const x = '#123456';");
    writeFileSync(join(dir, 'src', 'a.d.ts'), "declare const x: '#123456';");
    writeFileSync(join(dir, 'src', 'node_modules', 'b.css'), 'a { font-size: 11px; }');
    writeFileSync(join(dir, 'ok', 'a.css'), 'a { font-size: var(--text-sm); }');
    writeFileSync(join(dir, 'ok', 'readme.md'), 'font-size: 11px');
  });
  after(() => rmSync(dir, {recursive: true, force: true}));

  it('exits 1 and lists file, line and rule', () => {
    const {status, stderr} = run('src');
    assert.equal(status, 1);
    assert.match(stderr, /1 finding\(s\) in 1 file\(s\)/);
    assert.match(stderr, /src\/a\.css:2 \[text-size\] font-size 11px is below the 12px floor/);
  });

  it('exits 0 on a clean tree, scanning the current directory by default', () => {
    const {status, stdout} = run('ok');
    assert.equal(status, 0);
    assert.match(stdout, /1 file\(s\), no design drift/);
    assert.equal(run().status, 1);
  });

  it('accepts a single file', () => {
    assert.equal(run('src/a.css').status, 1);
    assert.equal(run('ok/a.css').status, 0);
  });

  it('exits 2 on an unknown option or a missing path', () => {
    assert.equal(run('--json').status, 2);
    const missing = run('nope');
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /no such file/);
  });

  it('prints usage', () => {
    const {status, stdout} = run('--help');
    assert.equal(status, 0);
    assert.match(stdout, /usage: lifekit-chrome-check drift/);
  });

  it('is checkDrift underneath', () => {
    const {files, findings} = checkDrift([join(dir, 'src')], {cwd: dir});
    assert.equal(files, 1);
    assert.deepEqual(
      findings.map(({file, line}) => [file, line]),
      [['src/a.css', 2]]
    );
  });
});
