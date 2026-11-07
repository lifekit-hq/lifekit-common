import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {test} from '@playwright/test';

import {MIN_TARGET, openStory, report, settleFrames, undersizedTargets} from './phone-helpers';

// Every control on every golden screen of the page templates presses as at least 44x44 CSS px on a
// phone (docs/PHONE-CONTRACT.md, rule 3). The golden screens are the reference app the library is
// approved against, so a control that is too small to tap there is fixed in the component, not
// accepted here. The stories are read from the built catalog, so a new golden screen is covered
// without touching this file.

interface IndexEntry {
  id: string;
  type: string;
}

const GOLDEN_PREFIX = 'templates-';
const PHONE = {width: 390, height: 844};
const READY = 'cmn-page[data-cmn-page]';

const index = JSON.parse(
  readFileSync(join(__dirname, '../../storybook-static/index.json'), 'utf8')
) as {entries: Record<string, IndexEntry>};

/** `templates-list--phone-dark` is the screen `templates-list`; a named state is a screen of its own. */
const screenOf = (id: string): string => {
  const [kind, variant = ''] = id.split('--');
  const state = variant.replace(/^(phone|desktop)-?/, '').replace(/-?dark$/, '');
  return state ? `${kind}-${state}` : kind;
};

const firstStoryOf = new Map<string, string>();
for (const entry of Object.values(index.entries)) {
  if (entry.type === 'story' && entry.id.startsWith(GOLDEN_PREFIX)) {
    if (!firstStoryOf.has(screenOf(entry.id))) {
      firstStoryOf.set(screenOf(entry.id), entry.id);
    }
  }
}

test.describe('golden screens | phone targets', () => {
  test.use({viewport: PHONE, hasTouch: true, isMobile: true});

  test('the catalog has golden screens to measure', () => {
    test.expect(firstStoryOf.size).toBeGreaterThan(0);
  });

  for (const [screen, id] of firstStoryOf) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${screen} (${theme}) | every control is at least ${MIN_TARGET}x${MIN_TARGET}`, async ({
        page,
      }) => {
        await openStory(page, id, theme, READY);
        await settleFrames(page);
        report(await undersizedTargets(page, MIN_TARGET), 'enforce');
      });
    }
  }
});
