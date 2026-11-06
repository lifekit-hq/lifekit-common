import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';

import templateParser from '@angular-eslint/template-parser';
import {Linter, RuleTester} from 'eslint';
import tsEslint from 'typescript-eslint';

import lifekit from '../eslint/lifekit-plugin.mjs';

const template = new RuleTester({languageOptions: {parser: templateParser}});
const script = new RuleTester();
const component = new RuleTester({languageOptions: {parser: tsEslint.parser}});

test('no-raw-controls flags raw controls where a cmn-* exists (guardrails X1)', () => {
  template.run('no-raw-controls', lifekit.rules['no-raw-controls'], {
    valid: [
      {code: '<cmn-button>Save</cmn-button>', filename: 'a.html'},
      {code: '<cmn-input formControlName="email" />', filename: 'a.html'},
      {code: '<input type="hidden" name="csrf" />', filename: 'a.html'},
      {code: '<input type="file" />', filename: 'a.html'},
      {code: '<input type="date" />', filename: 'a.html'},
    ],
    invalid: [
      {
        code: '<button type="button">Save</button>',
        filename: 'a.html',
        errors: [{messageId: 'raw'}],
      },
      {code: '<input />', filename: 'a.html', errors: [{messageId: 'raw'}]},
      {code: '<input [type]="kind" />', filename: 'a.html', errors: [{messageId: 'raw'}]},
      {code: '<input type="checkbox" />', filename: 'a.html', errors: [{messageId: 'raw'}]},
      {code: '<input type="search" />', filename: 'a.html', errors: [{messageId: 'raw'}]},
      {code: '<select></select>', filename: 'a.html', errors: [{messageId: 'raw'}]},
      {code: '<textarea></textarea>', filename: 'a.html', errors: [{messageId: 'raw'}]},
      {code: '<table></table>', filename: 'a.html', errors: [{messageId: 'raw'}]},
      {
        code: '@if (open) { <BUTTON type="button">Go</BUTTON> }',
        filename: 'a.html',
        errors: [{messageId: 'raw'}],
      },
    ],
  });
});

test('no-local-currency-format flags local currency formatting (guardrails $1)', () => {
  script.run('no-local-currency-format', lifekit.rules['no-local-currency-format'], {
    valid: [
      "new Intl.NumberFormat('en-IE').format(5);",
      "new Intl.NumberFormat('en-IE', {style: 'percent'}).format(0.5);",
      "formatMoney(5, 'EUR');",
      "(5).toLocaleString('en-IE');",
    ],
    invalid: [
      {
        code: "new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(5);",
        errors: [{messageId: 'local'}],
      },
      {
        code: "Intl.NumberFormat(locale, {'style': 'currency', currency}).format(5);",
        errors: [{messageId: 'local'}],
      },
      {
        code: "amount.toLocaleString('en-IE', {style: 'currency', currency: 'EUR'});",
        errors: [{messageId: 'local'}],
      },
    ],
  });
  template.run('no-local-currency-format', lifekit.rules['no-local-currency-format'], {
    valid: [{code: "{{ amount | cmnMoney: 'EUR' }}", filename: 'a.html'}],
    invalid: [
      {code: "{{ amount | currency: 'EUR' }}", filename: 'a.html', errors: [{messageId: 'local'}]},
    ],
  });
});

/** Lints with the whole plugin on, as a consumer would, so disable directives resolve. */
function lint(code, filename, extraRules = {}) {
  const rules = {
    ...extraRules,
    'lifekit/no-raw-controls': 'warn',
    'lifekit/no-local-currency-format': 'warn',
    'lifekit/require-disable-reason': 'warn',
  };
  const config = [
    {linterOptions: {reportUnusedDisableDirectives: 'off'}},
    {files: ['**/*.ts'], plugins: {lifekit}, rules},
    {files: ['**/*.html'], plugins: {lifekit}, languageOptions: {parser: templateParser}, rules},
  ];
  return new Linter().verify(code, config, filename).map(message => message.ruleId);
}

test('require-disable-reason asks for a reason when a lifekit rule is disabled', () => {
  assert.deepEqual(
    lint(
      '<!-- eslint-disable-next-line lifekit/no-raw-controls -- a third-party widget needs it -->\n<input />',
      'a.html'
    ),
    []
  );
  assert.deepEqual(
    lint('<!-- eslint-disable-next-line lifekit/no-raw-controls -->\n<input />', 'a.html'),
    ['lifekit/require-disable-reason']
  );
  assert.deepEqual(
    lint(
      "// eslint-disable-next-line lifekit/no-local-currency-format -- a CSV export, not display\nnew Intl.NumberFormat('en', {style: 'currency', currency: 'EUR'});",
      'a.ts'
    ),
    []
  );
  assert.deepEqual(
    lint(
      "/* eslint-disable lifekit/no-local-currency-format */\nnew Intl.NumberFormat('en', {style: 'currency', currency: 'EUR'});",
      'a.ts'
    ),
    ['lifekit/require-disable-reason']
  );
  assert.deepEqual(lint('<!-- eslint-disable-next-line no-console -->\n<p></p>', 'a.html'), []);
});

test('the preset warns on the lifekit rules for apps and turns them off for the library', async () => {
  const {createEslintConfig} = await import('../eslint/index.mjs');
  const severity = (configs, rule) =>
    configs.reduce((level, config) => config.rules?.[rule] ?? level, undefined);
  const rules = [
    'lifekit/no-raw-controls',
    'lifekit/no-local-currency-format',
    'lifekit/page-root',
  ];

  const app = createEslintConfig({selectorPrefix: 'app'});
  const library = createEslintConfig({selectorPrefix: 'cmn', consumerGuardrails: false});

  for (const rule of rules) {
    assert.equal(severity(app, rule), 'warn', rule);
    assert.equal(severity(library, rule), 'off', rule);
  }
});

const page = lifekit.rules['page-root'];

test('page-root requires a routed page to be rooted on cmn-page (template)', () => {
  template.run('page-root', page, {
    valid: [
      {code: '<cmn-page kind="list"><cmn-button>Go</cmn-button></cmn-page>', filename: 'a.html'},
      {code: '<cmn-page />', filename: 'a.html'},
      {
        // Whitespace, @let, ng-template declarations and comments render nothing at the root.
        code: '<!-- the page -->\n@let name = user().name;\n<ng-template #row let-r>{{ r }}</ng-template>\n<cmn-page>{{ name }}</cmn-page>\n',
        filename: 'a.html',
      },
      {
        // Control flow and layout belong inside the page, not around it.
        code: '<cmn-page>@if (open) { <div class="flex gap-2 p-4 w-full"></div> }</cmn-page>',
        filename: 'a.html',
      },
      {
        // Spacing on a child of the page is the page's content, not the page.
        code: '<cmn-page><section class="p-4 mx-auto max-w-[640px]"></section></cmn-page>',
        filename: 'a.html',
      },
      {code: '<cmn-page class="block" style="display: block"></cmn-page>', filename: 'a.html'},
    ],
    invalid: [
      {code: '<div></div>', filename: 'a.html', errors: [{messageId: 'missing'}]},
      {
        code: '<div class="p-4"><cmn-page /></div>',
        filename: 'a.html',
        errors: [{messageId: 'missing'}],
      },
      {code: '', filename: 'a.html', errors: [{messageId: 'missing'}]},
      {code: 'Hello {{ name }}', filename: 'a.html', errors: [{messageId: 'missing'}]},
      {
        code: '@if (ready) { <cmn-page /> }',
        filename: 'a.html',
        errors: [{messageId: 'missing'}],
      },
      {
        code: '<cmn-page /><cmn-alert />',
        filename: 'a.html',
        errors: [{messageId: 'outside', data: {found: '<cmn-alert>'}}],
      },
      {
        code: '<cmn-page />\n<p>Footer</p>\nstray',
        filename: 'a.html',
        errors: [{messageId: 'outside'}, {messageId: 'outside'}],
      },
    ],
  });
});

test('page-root flags spacing the page sets on cmn-page (template)', () => {
  const spacing = (code, ...found) => ({
    code,
    filename: 'a.html',
    errors: found.map(token => ({messageId: 'spacing', data: {owner: '<cmn-page>', found: token}})),
  });
  template.run('page-root', page, {
    valid: [],
    invalid: [
      spacing('<cmn-page class="p-4"></cmn-page>', 'p-4'),
      spacing('<cmn-page class="block px-cmn-page-gutter"></cmn-page>', 'px-cmn-page-gutter'),
      spacing('<cmn-page class="md:pt-6 -mt-2"></cmn-page>', 'md:pt-6', '-mt-2'),
      spacing('<cmn-page class="!mx-auto max-w-[640px]"></cmn-page>', '!mx-auto', 'max-w-[640px]'),
      spacing(
        '<cmn-page class="has-[cmn-page-scroll]:w-full"></cmn-page>',
        'has-[cmn-page-scroll]:w-full'
      ),
      spacing('<cmn-page class="size-full min-w-0"></cmn-page>', 'size-full', 'min-w-0'),
      spacing('<cmn-page style="padding: 16px; display: block"></cmn-page>', 'padding'),
      spacing(
        '<cmn-page style="margin-inline: auto; max-width: 40rem"></cmn-page>',
        'margin-inline',
        'max-width'
      ),
      spacing('<cmn-page [class.p-4]="dense()"></cmn-page>', 'p-4'),
      spacing('<cmn-page [style.padding.px]="gutter()"></cmn-page>', 'padding'),
      spacing('<cmn-page [style.width]="width()"></cmn-page>', 'width'),
    ],
  });
});

test('page-root flags spacing on the page host (class metadata)', () => {
  const host = (decorator, ...found) => ({
    code: `@Component({selector: 'app-x-page', ${decorator}})\nexport class XPage {}`,
    errors: found.map(name => ({
      messageId: 'spacing',
      data: {owner: 'The page host', found: name},
    })),
  });
  component.run('page-root', page, {
    valid: [
      "@Component({selector: 'app-x-page', template: '<cmn-page />'})\nexport class XPage {}",
      "@Component({selector: 'app-x-page', host: {class: 'block', '[attr.data-x]': 'x()'}})\nexport class XPage {}",
      "@Component({selector: 'app-x-page', host: {class: 'flex gap-2 min-h-0'}})\nexport class XPage {}",
      // Spacing of an inner element or a different selector is the page's content.
      "@Component({selector: 'app-x-page', styles: ['.row { padding: 8px } :host(.x) .row { margin: 1px }']})\nexport class XPage {}",
      "@Component({selector: 'app-x-page', styles: [':host { display: block; color: red }']})\nexport class XPage {}",
      // A host binding that is not spacing is the page's own business.
      "@Component({selector: 'x'})\nexport class XPage { @HostBinding('class.is-open') open = true; }",
    ],
    invalid: [
      host("host: {class: 'block p-4'}", 'p-4'),
      host("host: {class: 'block md:px-6 mx-auto'}", 'md:px-6', 'mx-auto'),
      host("host: {style: 'padding: 16px; display: block'}", 'padding'),
      host("host: {'[class.p-4]': 'dense()'}", 'p-4'),
      host("host: {'[style.padding.px]': 'gutter()'}", 'padding'),
      host("host: {'[style.max-width]': '\"40rem\"'}", 'max-width'),
      host("styles: [':host { display: block; padding: 16px }']", 'padding'),
      host('styles: `:host { margin-block: 8px; width: 100% }`', 'margin-block', 'width'),
      host("styles: ['@media (min-width: 600px) { :host { padding: 24px } }']", 'padding'),
      host("styles: ['cmn-page { padding: 16px }']", 'padding'),
      host("styles: [':host(.dense), .other { padding: 0 }']", 'padding'),
      {
        code: "@Component({selector: 'x'})\nexport class XPage { @HostBinding('class.px-4') pad = true; }",
        errors: [{messageId: 'spacing', data: {owner: 'The page host', found: 'px-4'}}],
      },
      {
        code: "@Component({selector: 'x'})\nexport class XPage { @HostBinding('style.padding') get pad() { return '1rem'; } }",
        errors: [{messageId: 'spacing', data: {owner: 'The page host', found: 'padding'}}],
      },
    ],
  });
});

test('page-root reads the stylesheet a page links', () => {
  const dir = mkdtempSync(join(tmpdir(), 'page-root-'));
  try {
    mkdirSync(join(dir, 'ok'));
    writeFileSync(
      join(dir, 'padded.css'),
      '/* the host */\n:host {\n  display: block;\n  padding: 16px;\n}\n'
    );
    writeFileSync(
      join(dir, 'plain.scss'),
      ':host {\n  display: block;\n}\n// .row { padding: 1px }\n.row { padding: 8px }\n'
    );
    const filename = join(dir, 'x.page.ts');
    const source = urls => `@Component({selector: 'x', ${urls}})\nexport class XPage {}`;
    component.run('page-root', page, {
      valid: [
        {code: source("styleUrl: './plain.scss'"), filename},
        {code: source("styleUrls: ['./plain.scss', './missing.css']"), filename},
      ],
      invalid: [
        {
          code: source("styleUrl: './padded.css'"),
          filename,
          errors: [
            {
              messageId: 'spacing',
              data: {owner: 'The page host', found: 'padding in ./padded.css'},
            },
          ],
        },
        {
          code: source("styleUrls: ['./plain.scss', './padded.css']"),
          filename,
          errors: [{messageId: 'spacing'}],
        },
      ],
    });
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});

test('require-disable-reason covers page-root', () => {
  assert.deepEqual(
    lint(
      '<!-- eslint-disable-next-line lifekit/page-root -- an auth screen has no page frame -->\n<div></div>',
      'a.html',
      {'lifekit/page-root': 'warn'}
    ),
    []
  );
  assert.deepEqual(
    lint('<!-- eslint-disable-next-line lifekit/page-root -->\n<div></div>', 'a.html'),
    ['lifekit/require-disable-reason']
  );
});

test('the preset applies page-root to page files and their inline templates only', async () => {
  const {ESLint} = await import('eslint');
  const {createEslintConfig} = await import('../eslint/index.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'page-root-preset-'));
  try {
    writeFileSync(
      join(dir, 'tsconfig.json'),
      '{"compilerOptions":{"experimentalDecorators":true}}'
    );
    const component = (template, extra = '') =>
      `@Component({selector: 'app-x', template: \`${template}\`${extra}})\nexport class X {}\n`;
    const files = {
      'a/x.page.ts': component('<div></div>', ", host: {class: 'p-4'}"),
      'a/pages/y/y.component.ts': component('<cmn-page class="p-4"></cmn-page>'),
      'a/ok.page.ts': component('<cmn-page></cmn-page>'),
      'a/shell.component.ts': component('<div></div>', ", host: {class: 'p-4'}"),
      'a/x.page.spec.ts': component('<div></div>'),
    };
    for (const [name, text] of Object.entries(files)) {
      mkdirSync(join(dir, name, '..'), {recursive: true});
      writeFileSync(join(dir, name), text);
    }
    const eslint = new ESLint({
      cwd: dir,
      overrideConfigFile: true,
      overrideConfig: createEslintConfig({selectorPrefix: 'app', tsconfigRootDir: dir}),
    });
    const results = await eslint.lintFiles(Object.keys(files));
    const pageRules = Object.fromEntries(
      results.map(result => [
        result.filePath.slice(dir.length + 1),
        result.messages.filter(m => m.ruleId === 'lifekit/page-root').map(m => m.messageId),
      ])
    );
    assert.deepEqual(pageRules, {
      'a/x.page.ts': ['spacing', 'missing'],
      'a/pages/y/y.component.ts': ['spacing'],
      'a/ok.page.ts': [],
      'a/shell.component.ts': [],
      'a/x.page.spec.ts': [],
    });
    assert.ok(
      results.every(result =>
        result.messages.filter(m => m.ruleId === 'lifekit/page-root').every(m => m.severity === 1)
      ),
      'a warning for one release'
    );
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});
