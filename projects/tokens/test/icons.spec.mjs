import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {afterEach, beforeEach, describe, it} from 'node:test';

import {checkIcons, ICON_RULES, ICON_SUBSET, scanIcons} from '../icons/index.mjs';

const BIN = fileURLToPath(new URL('../bin/lifekit-chrome-check.mjs', import.meta.url));
const UI_ICON_SET = fileURLToPath(
  new URL('../../ui/src/lib/components/icon/lucide-icon-set.ts', import.meta.url)
);

// Outside the subset today; if a library change ever adds one, pick another.
const OUTSIDE = ['Anchor', 'Rocket'];

describe('the shipped subset', () => {
  it('is the one <cmn-icon> registers, and holds the icons basket was missing', () => {
    const registered = [...readFileSync(UI_ICON_SET, 'utf8').matchAll(/^ {2}(\w+),$/gm)].map(
      m => m[1]
    );
    assert.deepEqual([...ICON_SUBSET].sort(), [...new Set(registered)].sort());
    for (const name of ['BadgePercent', 'WalletCards', 'Maximize2']) {
      assert.ok(ICON_SUBSET.has(name), name);
    }
  });

  it('leaves the icons these tests rely on outside it', () => {
    for (const name of OUTSIDE) assert.ok(!ICON_SUBSET.has(name), name);
  });
});

describe('scanIcons', () => {
  it('finds quoted Lucide names in TS and templates, with their lines', () => {
    const {used} = scanIcons(
      'a.ts',
      `const tabs = [\n  {icon: '${OUTSIDE[0]}'},\n  {icon: "Plus"},\n];\nconst t = \`<cmn-icon name="${OUTSIDE[1]}" />\`;`
    );
    assert.deepEqual(used, [
      {name: OUTSIDE[0], line: 2},
      {name: 'Plus', line: 3},
      {name: OUTSIDE[1], line: 5},
    ]);
    const html = scanIcons('a.html', `<p></p>\n<cmn-icon name="${OUTSIDE[0]}" />`).used;
    assert.deepEqual(html, [{name: OUTSIDE[0], line: 2}]);
  });

  it('ignores strings that are not Lucide names, and comments', () => {
    const {used} = scanIcons(
      'a.ts',
      `const s = 'Hello'; const k = 'plus';\n// icon: '${OUTSIDE[0]}'\n/* '${OUTSIDE[1]}' */`
    );
    assert.deepEqual(used, []);
    assert.deepEqual(scanIcons('a.html', `<!-- name="${OUTSIDE[0]}" -->`).used, []);
  });

  it('reads the names a provideLucideIcons call registers', () => {
    const read = text => scanIcons('a.ts', text);
    assert.deepEqual(
      read(`provideLucideIcons({${OUTSIDE[0]}, ${OUTSIDE[1]}})`).registered,
      OUTSIDE
    );
    assert.deepEqual(
      read(`provideLucideIcons({\n  ${OUTSIDE[0]},\n  Rocket: RocketIcon,\n  'Anchor2': X,\n})`)
        .registered,
      [OUTSIDE[0], 'Rocket', 'Anchor2']
    );
    const provider = read(
      `{provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider({${OUTSIDE[0]}})}`
    );
    assert.deepEqual(provider.registered, [OUTSIDE[0]]);
    assert.deepEqual(provider.unreadable, []);
  });

  it('flags a registration it cannot read', () => {
    for (const call of [
      'provideLucideIcons(icons)',
      'provideLucideIcons({...icons})',
      'provideLucideIcons({[name]: Icon})',
      'provideLucideIcons({a: 1',
    ]) {
      assert.deepEqual(scanIcons('a.ts', `\n${call}`).unreadable, [{line: 2}], call);
    }
    assert.deepEqual(
      scanIcons('a.ts', 'export function provideLucideIcons(map: LucideIcons) {}').unreadable,
      []
    );
  });
});

describe('checkIcons', () => {
  let dir;
  const app = files => {
    for (const [name, text] of Object.entries(files)) {
      mkdirSync(join(dir, name, '..'), {recursive: true});
      writeFileSync(join(dir, name), text);
    }
    return checkIcons([dir], {cwd: dir});
  };
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'lifekit-icons-'));
  });
  afterEach(() => rmSync(dir, {recursive: true, force: true}));

  it('passes an app that uses only subset icons', () => {
    const {findings, files} = app({'src/a.ts': "const i = ['Plus', 'WalletCards'];"});
    assert.deepEqual(findings, []);
    assert.equal(files, 1);
  });

  it('fails a name outside the subset that the app does not register', () => {
    const {findings} = app({'src/a.ts': `const tab = {icon: '${OUTSIDE[0]}'};`});
    assert.equal(findings.length, 1);
    assert.deepEqual(
      {file: findings[0].file, line: findings[0].line, rule: findings[0].rule},
      {file: 'src/a.ts', line: 1, rule: 'missing-icon'}
    );
    assert.match(findings[0].message, new RegExp(`"${OUTSIDE[0]}"`));
  });

  it('passes it once the app registers the name, in another file', () => {
    const {findings} = app({
      'src/a.ts': `const tab = {icon: '${OUTSIDE[0]}'};`,
      'src/app.config.ts': `export const c = [provideLucideIcons({${OUTSIDE[0]}})];`,
    });
    assert.deepEqual(findings, []);
  });

  it('reports each name separately, in a template as well', () => {
    const {findings} = app({
      'src/a.ts': `provideLucideIcons({${OUTSIDE[0]}});`,
      'src/b.html': `<cmn-icon name="${OUTSIDE[0]}" />\n<cmn-icon name="${OUTSIDE[1]}" />`,
    });
    assert.deepEqual(
      findings.map(f => `${f.file}:${f.line} ${f.rule}`),
      ['src/b.html:2 missing-icon']
    );
  });

  it('fails a registration it cannot read', () => {
    const {findings} = app({'src/a.ts': 'provideLucideIcons(icons);'});
    assert.deepEqual(
      findings.map(f => f.rule),
      ['registration']
    );
  });

  it('skips specs, stories, declarations, build output and dot-directories', () => {
    const text = `const i = '${OUTSIDE[0]}';`;
    const {findings} = app({
      'src/a.spec.ts': text,
      'src/a.stories.ts': text,
      'src/a.d.ts': text,
      'dist/a.ts': text,
      'node_modules/x/a.ts': text,
      '.cache/a.ts': text,
    });
    assert.deepEqual(findings, []);
  });

  it('names the rules', () => {
    assert.deepEqual(ICON_RULES, ['missing-icon', 'registration']);
  });
});

describe('lifekit-chrome-check icons', () => {
  let dir;
  const run = (...args) =>
    spawnSync(process.execPath, [BIN, 'icons', ...args], {cwd: dir, encoding: 'utf8'});
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'lifekit-icons-cli-'));
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src/ok.ts'), "export const i = 'Plus';");
  });
  afterEach(() => rmSync(dir, {recursive: true, force: true}));

  it('exits 0 when every icon renders', () => {
    const result = run('src');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /1 file\(s\), every icon renders/);
  });

  it('exits 1 and names the file, line and icon when one would render empty', () => {
    writeFileSync(join(dir, 'src/bad.ts'), `\nexport const i = '${OUTSIDE[0]}';`);
    const result = run('src');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /1 finding\(s\) in 2 file\(s\)/);
    assert.match(result.stderr, new RegExp(`src/bad\\.ts:2 \\[missing-icon\\] "${OUTSIDE[0]}"`));
    writeFileSync(
      join(dir, 'src/bad.ts'),
      `import {${OUTSIDE[0]}} from 'lucide-angular';\nprovideLucideIcons({${OUTSIDE[0]}});\nexport const i = '${OUTSIDE[0]}';`
    );
    assert.equal(run('src').status, 0);
  });

  it('exits 2 on an unknown option or a missing path', () => {
    assert.equal(run('--nope').status, 2);
    assert.equal(run('missing').status, 2);
  });

  it('prints its usage for --help', () => {
    const result = run('--help');
    assert.equal(result.status, 0);
    assert.match(result.stdout, /usage: lifekit-chrome-check icons/);
  });
});
