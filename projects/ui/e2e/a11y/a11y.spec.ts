import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import AxeBuilder from '@axe-core/playwright';
import {expect, test} from '@playwright/test';

// Accessibility gate (WCAG 2.2 AA, PRODUCT.md): axe-core over every story of the built Storybook
// in light and dark. A serious or critical violation fails the test unless it is listed in
// a11y-exceptions.json with a reason. Fix violations in the component, not in the story.
//
// An exception is {"rule": "<axe rule id>", "story": "<story id>", "reason": "<one line>"}; omit
// "story" to cover the rule in every story.

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);
const THEMES = ['light', 'dark'] as const;
const STORY_READY_TIMEOUT = 15000;

interface Exception {
  rule: string;
  story?: string;
  reason: string;
}

interface IndexEntry {
  id: string;
  type: string;
}

const exceptions: Exception[] = JSON.parse(
  readFileSync(join(__dirname, 'a11y-exceptions.json'), 'utf8')
) as Exception[];

const index = JSON.parse(
  readFileSync(join(__dirname, '../../storybook-static/index.json'), 'utf8')
) as {entries: Record<string, IndexEntry>};

const stories = Object.values(index.entries)
  .filter(entry => entry.type === 'story')
  .map(entry => entry.id);

const isExcepted = (rule: string, story: string): boolean =>
  exceptions.some(e => e.rule === rule && (e.story === undefined || e.story === story));

for (const theme of THEMES) {
  test.describe(`a11y ${theme}`, () => {
    for (const story of stories) {
      test(story, async ({page}) => {
        await page.goto(`/iframe.html?id=${story}&viewMode=story&globals=theme:${theme}`);
        await page.waitForSelector('#storybook-root > *, #storybook-docs', {
          state: 'attached',
          timeout: STORY_READY_TIMEOUT,
        });
        await page.evaluate(() => document.fonts.ready);

        const {violations} = await new AxeBuilder({page}).withTags(AXE_TAGS).analyze();
        const blocking = violations.filter(
          v => BLOCKING_IMPACTS.has(v.impact ?? '') && !isExcepted(v.id, story)
        );

        expect(
          blocking.map(v => ({
            rule: v.id,
            impact: v.impact,
            help: v.help,
            targets: v.nodes.slice(0, 5).map(n => n.target.join(' ')),
          }))
        ).toEqual([]);
      });
    }
  });
}
