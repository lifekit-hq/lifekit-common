import {appendFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';

import type {Reporter, TestCase, TestResult} from '@playwright/test/reporter';

const JSON_INDENT = 2;
const SEPARATOR = ' | ';

interface Violation {
  test: string;
  detail: string;
}

/** Collects `violation` annotations into results.json and the GitHub job summary. */
export default class SummaryReporter implements Reporter {
  private readonly violations: Violation[] = [];
  private readonly checks = new Map<string, {total: number; failing: number}>();

  public onTestEnd(test: TestCase, result: TestResult): void {
    const check = test.title.slice(test.title.lastIndexOf(' | ') + SEPARATOR.length);
    const entry = this.checks.get(check) ?? {total: 0, failing: 0};
    entry.total += 1;
    const found = test.annotations.filter(a => a.type === 'violation');
    if (found.length > 0 || result.status === 'failed') {
      entry.failing += 1;
    }
    for (const a of found) {
      this.violations.push({test: test.title, detail: a.description ?? ''});
    }
    this.checks.set(check, entry);
  }

  public onEnd(): void {
    const rows = [...this.checks.entries()].sort(([a], [b]) => a.localeCompare(b));
    const out = join(__dirname, 'results.json');
    mkdirSync(dirname(out), {recursive: true});
    writeFileSync(
      out,
      JSON.stringify(
        {
          total: this.violations.length,
          checks: Object.fromEntries(rows),
          violations: this.violations,
        },
        null,
        JSON_INDENT
      )
    );
    const lines = [
      '### Phone conformance (report-only)',
      '',
      `${this.violations.length} violation(s).`,
      '',
      '| Check | Cases failing | Cases |',
      '| --- | --- | --- |',
      ...rows.map(([name, c]) => `| ${name} | ${c.failing} | ${c.total} |`),
      '',
      '<details><summary>Violations</summary>',
      '',
      ...this.violations.map(v => `- \`${v.test}\`: ${v.detail}`),
      '',
      '</details>',
      '',
    ];
    const summary = process.env['GITHUB_STEP_SUMMARY'];
    if (summary) {
      appendFileSync(summary, lines.join('\n'));
    }
    process.stdout.write(`${lines.join('\n')}\n`);
  }
}
