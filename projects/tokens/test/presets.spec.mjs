/**
 * Design presets (presets/<id>.css, selected by `data-preset` on <html>): the rules every preset
 * file must meet, checked by test/presets-check.mjs. Carbon is the unscoped default in theme.css,
 * so it has no file; the shipped files are checked as they land, and the rules themselves are
 * proved here against small fixtures, so a rule that stops firing fails this spec.
 */
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {describe, it} from 'node:test';

import {checkPreset} from './presets-check.mjs';

const PRESETS_DIR = new URL('../presets/', import.meta.url);
const themeCss = readFileSync(new URL('../theme.css', import.meta.url), 'utf8');

/** A theme.css in miniature: one hook of each kind a preset can break. */
const FIXTURE_THEME = `
:root, [data-theme='light'] {
  --radius-md: 0px;
  --size-touch: 44px;
  --cmn-size-lg: 48px;
  --cmn-control-h: var(--cmn-size-lg);
  --cmn-page-gutter: 16px;
  --cmn-field-border-bottom: 1px solid var(--color-border-strong);
  --cmn-field-border-width: 0 0 1px 0;
  --cmn-btn-bg: var(--color-text-primary);
  --cmn-btn-fg: var(--color-text-inverse);
  --shadow-md: 0 1px 2px rgba(0, 0, 0, 0.1);
  --color-surface-bg: #f3f5f6;
  --color-surface-card: #ffffff;
  --color-text-primary: #0f1a1f;
  --color-text-inverse: #ffffff;
  --color-border-default: #dce3e6;
  --color-border-strong: #62727a;
  --color-accent-default: #175a6d;
}
[data-theme='dark'] {
  --shadow-md: 0 1px 2px rgba(0, 0, 0, 0.4);
  --color-surface-bg: #0c1113;
  --color-surface-card: #141b1e;
  --color-text-primary: #e4ebed;
  --color-text-inverse: #0a2830;
  --color-border-default: #27333a;
  --color-border-strong: #62727a;
  --color-accent-default: #5aa9bb;
}
@media (min-width: 768px) {
  :root, [data-theme='light'] { --cmn-page-gutter: 32px; }
}
`;

const GOOD = `
@font-face { font-family: 'Soft Sans'; src: url('./soft-sans.woff2') format('woff2'); }
:root[data-preset='soft'] {
  --radius-md: 12px;
  --cmn-control-h: 40px;
  --cmn-page-gutter: 20px;
  --cmn-field-border-bottom: 1px solid var(--color-border-strong);
  --shadow-md: 0 2px 6px rgba(0, 0, 0, 0.12);
}
:root[data-preset='soft'][data-theme='dark'] { --shadow-md: 0 2px 6px rgba(0, 0, 0, 0.5); }
@media (max-width: 767px) { :root[data-preset='soft'] { --cmn-control-h: 44px; } }
@media (min-width: 768px) { :root[data-preset='soft'] { --cmn-page-gutter: 36px; } }
`;

const check = (css, id = 'soft', theme = FIXTURE_THEME) => checkPreset({id, css, themeCss: theme});

describe('preset rules', () => {
  it('pass a preset that overrides tokens, restates its dark and per-width values and floors the phone', () => {
    assert.deepEqual(check(GOOD), []);
  });

  it('reject a --color-* override: colour stays on the seed axis', () => {
    const problems = check(`:root[data-preset='soft'] { --color-accent-default: #ff0000; }`);
    assert.match(problems.join('\n'), /--color-accent-default overrides a colour/);
  });

  it('reject a token theme.css does not declare', () => {
    const problems = check(`:root[data-preset='soft'] { --cmn-made-up: 3px; }`);
    assert.match(problems.join('\n'), /--cmn-made-up is not declared in theme\.css/);
  });

  it('reject a plain property and a rule not scoped to its own id', () => {
    assert.match(
      check(`:root[data-preset='soft'] { color: red; }`).join('\n'),
      /not a custom property/
    );
    assert.match(check(`:root { --radius-md: 4px; }`).join('\n'), /selector ":root" must be/);
    assert.match(
      check(`:root[data-preset='crisp'] { --radius-md: 4px; }`).join('\n'),
      /selector ":root\[data-preset='crisp'\]" must be/
    );
    assert.match(check(`html[data-preset='soft'] { --radius-md: 4px; }`).join('\n'), /must be/);
  });

  it('reject carbon and a malformed id as a preset file', () => {
    assert.match(
      check(`:root[data-preset='carbon'] { --radius-md: 0; }`, 'carbon').join('\n'),
      /other than carbon/
    );
    assert.match(
      check(`:root[data-preset='Soft'] { --radius-md: 0; }`, 'Soft').join('\n'),
      /lowercase id/
    );
  });

  it('reject a control height under 44px on a phone, and accept it once restated for phone width', () => {
    const short = `:root[data-preset='soft'] { --cmn-control-h: 36px; }
      @media (min-width: 768px) { :root[data-preset='soft'] { --cmn-page-gutter: 20px; } }
      :root[data-preset='soft'] { --cmn-page-gutter: 20px; }`;
    assert.match(check(short).join('\n'), /--cmn-control-h is 36px at phone width/);
    const fixed = `${short}
      @media (max-width: 767px) { :root[data-preset='soft'] { --cmn-control-h: 44px; } }`;
    assert.deepEqual(check(fixed), []);
  });

  it('reject a touch target under 44px', () => {
    assert.match(
      check(`:root[data-preset='soft'] { --size-touch: 40px; }`).join('\n'),
      /--size-touch is 40px/
    );
  });

  it('reject a control height that does not resolve to px', () => {
    const problems = check(`:root[data-preset='soft'] { --cmn-control-h: calc(2 * 1rem); }`);
    assert.match(problems.join('\n'), /--cmn-control-h does not resolve to a px length/);
  });

  it('reject a dark-themed token set without its dark value', () => {
    const problems = check(`:root[data-preset='soft'] { --shadow-md: none; }`);
    assert.match(problems.join('\n'), /--shadow-md has a dark value in theme\.css/);
  });

  it('reject a per-width token set without its per-width value', () => {
    const problems = check(`:root[data-preset='soft'] { --cmn-page-gutter: 20px; }`);
    assert.match(
      problems.join('\n'),
      /--cmn-page-gutter changes under @media \(min-width: 768px\)/
    );
  });

  it('reject a field border under 3:1 on a surface, in either theme', () => {
    const problems = check(
      `:root[data-preset='soft'] { --cmn-field-border-bottom: 1px solid var(--color-border-default); }`
    );
    assert.match(
      problems.join('\n'),
      /--cmn-field-border-bottom is 1\.\d\d:1 on --color-surface-card in the light theme/
    );
    assert.match(problems.join('\n'), /in the dark theme; a field border needs 3:1/);
  });

  it('read a border colour through var() chains and skip borders that carry no colour', () => {
    assert.deepEqual(check(`:root[data-preset='soft'] { --cmn-field-border-width: 1px; }`), []);
    assert.deepEqual(
      check(`:root[data-preset='soft'] { --cmn-field-border-bottom: 2px solid #808080; }`),
      []
    );
  });

  it('reject a field border colour it cannot read, rather than skip it', () => {
    const problems = check(
      `:root[data-preset='soft'] { --cmn-field-border-bottom: 1px solid color-mix(in srgb, red, blue); }`
    );
    assert.match(problems.join('\n'), /no #hex colour the test can read/);
  });

  it('reject a -bg/-fg pair under 4.5:1', () => {
    const problems = check(
      `:root[data-preset='soft'] { --cmn-btn-bg: var(--color-border-default); --cmn-btn-fg: var(--color-surface-card); }`
    );
    assert.match(
      problems.join('\n'),
      /--cmn-btn-fg on --cmn-btn-bg is 1\.\d\d:1 in the light theme/
    );
  });

  it('reject a remote font', () => {
    const problems = check(
      `@font-face { font-family: X; src: url(https://fonts.example/x.woff2); }`
    );
    assert.match(problems.join('\n'), /remote; self-host the font/);
  });

  it('hold for the real theme.css: a preset written against it passes, and one that floors nothing fails', () => {
    const real = `
      :root[data-preset='soft'] {
        --radius-md: 12px;
        --cmn-page-gutter: 20px;
        --cmn-title-gap: 20px;
        --cmn-field-border-bottom: 1px solid var(--color-border-strong);
        --shadow-md: 0 2px 6px rgba(0, 0, 0, 0.12);
      }
      :root[data-preset='soft'][data-theme='dark'] { --shadow-md: 0 2px 6px rgba(0, 0, 0, 0.5); }
      @media (min-width: 768px) {
        :root[data-preset='soft'] { --cmn-page-gutter: 36px; --cmn-title-gap: 28px; }
      }`;
    assert.deepEqual(check(real, 'soft', themeCss), []);
    const low = `:root[data-preset='soft'] { --cmn-control-h: 36px; }`;
    assert.match(check(low, 'soft', themeCss).join('\n'), /--cmn-control-h is 36px at phone width/);
  });
});

describe('shipped presets', () => {
  const files = readdirSync(PRESETS_DIR).filter(name => name.endsWith('.css'));

  it('keeps the presets directory to <id>.css files and the README', () => {
    const others = readdirSync(PRESETS_DIR).filter(
      name => !name.endsWith('.css') && name !== 'README.md' && !/\.(woff2?)$/.test(name)
    );
    assert.deepEqual(others, []);
  });

  for (const file of files) {
    it(`${file} meets every preset rule`, () => {
      const css = readFileSync(new URL(file, PRESETS_DIR), 'utf8');
      assert.deepEqual(checkPreset({id: file.replace(/\.css$/, ''), css, themeCss}), []);
    });
  }
});

describe('the package ships presets', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

  it('exports presets/* and lists the directory in files', () => {
    assert.equal(pkg.exports['./presets/*'], './presets/*');
    assert.ok(pkg.files.includes('presets/'));
  });

  it('defines the --space-* steps the Lit elements read, so a preset can reset them', () => {
    for (const step of [1, 2, 3, 4]) {
      assert.match(themeCss, new RegExp(`^\\s*--space-${step}:\\s*[\\d.]+rem;`, 'm'));
    }
  });
});

describe('hook rules (the real theme.css)', () => {
  const real = body =>
    checkPreset({id: 'soft', css: `:root[data-preset='soft'] { ${body} }`, themeCss});

  it('reject a field outline colour under 3:1', () => {
    const problems = real('--cmn-field-border-color: var(--color-border-default);');
    assert.match(
      problems.join('\n'),
      /--cmn-field-border-color is 1\.\d\d:1 on --color-surface-card/
    );
    const outline = real('--cmn-segmented-outline: var(--color-border-default);');
    assert.match(outline.join('\n'), /--cmn-segmented-outline is 1\.\d\d:1/);
  });

  it('reject a secondary button or segmented cell whose text is under 4.5:1 on its fill', () => {
    const button = real(
      '--cmn-btn-secondary-bg: var(--color-border-default); --cmn-btn-secondary-fg: var(--color-surface-card);'
    );
    assert.match(
      button.join('\n'),
      /--cmn-btn-secondary-fg on --cmn-btn-secondary-bg is 1\.\d\d:1/
    );
    const cell = real(
      '--cmn-segmented-active-bg: var(--color-border-default); --cmn-segmented-active-fg: var(--color-surface-card);'
    );
    assert.match(cell.join('\n'), /--cmn-segmented-active-fg on --cmn-segmented-active-bg/);
  });

  it('reject a fill that primary text cannot be read on, and accept a transparent one', () => {
    const dark = real('--cmn-nav-active-bg: var(--color-text-primary);');
    assert.match(dark.join('\n'), /--color-text-primary on --cmn-nav-active-bg is 1\.00:1/);
    assert.deepEqual(real('--cmn-tab-active-bg: transparent; --cmn-tabs-bg: transparent;'), []);
    const hover = real('--cmn-btn-secondary-hover: var(--color-surface-card);');
    assert.match(hover.join('\n'), /--cmn-btn-secondary-fg on --cmn-btn-secondary-hover/);
  });

  it('check the secondary hover fill against a text colour the preset changed, hover left at Carbon', () => {
    const problems = real(
      '--cmn-btn-secondary-bg: var(--color-accent-subtle); --cmn-btn-secondary-fg: var(--color-text-primary);'
    );
    assert.match(
      problems.join('\n'),
      /--cmn-btn-secondary-fg on --cmn-btn-secondary-hover is 2\.\d\d:1 in the light theme/
    );
  });

  it('check the select fill text sits on, and reject a fill the test cannot read', () => {
    const dark = real('--cmn-select-bg: #111111;');
    assert.match(
      dark.join('\n'),
      /--color-text-primary on --cmn-select-bg is 1\.\d\d:1 in the light theme/
    );
    const mixed = real('--cmn-nav-active-bg: color-mix(in srgb, red 10%, white);');
    assert.match(mixed.join('\n'), /--cmn-nav-active-bg does not resolve to a #hex colour/);
  });

  it('reject a toggle on colour under 3:1 on the surface, in either theme', () => {
    const problems = real('--cmn-toggle-on: var(--color-border-default);');
    assert.match(problems.join('\n'), /--cmn-toggle-on is 1\.\d\d:1 on --color-surface-card/);
    assert.match(problems.join('\n'), /in the dark theme; an on state needs 3:1/);
  });

  it('reject a toggle whose thumb does not fit its track, and accept one that does', () => {
    const problems = real('--cmn-toggle-thumb: 24px;');
    assert.match(problems.join('\n'), /thumb \(24px\) plus its padding \(4px each side\)/);
    assert.deepEqual(
      real(
        '--cmn-toggle-w: 36px; --cmn-toggle-h: 20px; --cmn-toggle-thumb: 14px; --cmn-toggle-pad: 3px;'
      ),
      []
    );
  });
});
