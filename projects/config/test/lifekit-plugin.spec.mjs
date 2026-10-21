import assert from 'node:assert/strict';
import {test} from 'node:test';

import templateParser from '@angular-eslint/template-parser';
import {Linter, RuleTester} from 'eslint';

import lifekit from '../eslint/lifekit-plugin.mjs';

const template = new RuleTester({languageOptions: {parser: templateParser}});
const script = new RuleTester();

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
function lint(code, filename) {
  const rules = {
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
  const rules = ['lifekit/no-raw-controls', 'lifekit/no-local-currency-format'];

  const app = createEslintConfig({selectorPrefix: 'app'});
  const library = createEslintConfig({selectorPrefix: 'cmn', consumerGuardrails: false});

  for (const rule of rules) {
    assert.equal(severity(app, rule), 'warn', rule);
    assert.equal(severity(library, rule), 'off', rule);
  }
});
