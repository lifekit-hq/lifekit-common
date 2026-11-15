import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {test} from '@playwright/test';

import {MIN_TARGET, report, settleFrames, undersizedTargets} from './phone-helpers';

// Every control in every component story presses as at least 44x44 CSS px on a phone
// (docs/PHONE-CONTRACT.md, rule 3), not only the ones a golden screen happens to draw. A control
// that is too small to tap is fixed in the component (`PHONE_HIT_AREA_CLASSES`, `.cmn-hit-slop`,
// or block padding for a link row), or the story that draws it is fixed. Only a control that is
// genuinely not a phone control is listed in EXEMPT, with the reason. The stories are read from the
// built catalog, so a new component is covered without touching this file.

interface IndexEntry {
  id: string;
  type: string;
}

const PHONE = {width: 390, height: 844};
const COMPONENT_STORY = /^(components-|primitives-link--link-rows$)/;
// A story's root element may itself be `display: contents` or empty, so it is waited for as present, not visible.
const RENDERED = '#storybook-root > *';

/** A target a story may draw under 44px: the story id, the target as the suite reports it, why. */
interface Exemption {
  story: RegExp;
  target: RegExp;
  why: string;
}

const EXEMPT: readonly Exemption[] = [
  {
    story: /^components-chat-chatmessage--(with-links|user-link)$/,
    target: /^a\[/,
    why: 'a link inside a sentence of chat prose is exempt from the target size (WCAG 2.5.8)',
  },
  {
    story: /^components-select--(multiple-)?search/,
    target: /^input\[/,
    why: 'the select field around the search input is the target: a tap anywhere on it focuses the input',
  },
  {
    story: /^components-sidebarnav--version-footer-button/,
    target: /^button\[/,
    why: 'the sidebar is on screen from 600px; below that the tab bar replaces it',
  },
];

const index = JSON.parse(
  readFileSync(join(__dirname, '../../storybook-static/index.json'), 'utf8')
) as {entries: Record<string, IndexEntry>};

const stories = Object.values(index.entries)
  .filter(entry => entry.type === 'story' && COMPONENT_STORY.test(entry.id))
  .map(entry => entry.id);

test.describe('component stories | phone targets', () => {
  test.use({viewport: PHONE, hasTouch: true, isMobile: true});

  test('the catalog has component stories to measure', () => {
    test.expect(stories.length).toBeGreaterThan(0);
  });

  for (const id of stories) {
    test(`${id} | every control is at least ${MIN_TARGET}x${MIN_TARGET}`, async ({page}) => {
      await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=theme:light`);
      await page.waitForSelector(RENDERED, {state: 'attached'});
      await settleFrames(page);
      const small = (await undersizedTargets(page, MIN_TARGET)).filter(
        target => !EXEMPT.some(rule => rule.story.test(id) && rule.target.test(target))
      );
      report(small, 'enforce');
    });
  }
});
