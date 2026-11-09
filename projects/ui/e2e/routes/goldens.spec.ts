import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {defineRouteScans, type RouteScanRoute} from '@lifekit-hq/tokens/screen';
import {expect, test} from '@playwright/test';

// The route scan (docs/ROUTE-SCAN.md) over every golden screen of the page templates: the design
// judge and axe-core on the settled page, at 390 and 1280, light and dark. The reference app takes
// no exceptions: a finding on a golden is fixed in the library (a component, a token or a template),
// not accepted here.
//
// The golden stories are read from the built catalog. A story's name (`phone`, `phone-dark`, `desktop`,
// `desktop-dark`) only says which size and scheme the owner looks at it in; the scan runs every
// screen at both sizes and both schemes itself, so the variants of one
// screen are one route here. A named state (`phone-with-notice`) is a screen of its own.

interface IndexEntry {
  id: string;
  type: string;
}

const GOLDEN_PREFIX = 'templates-';
const STORY_READY_TIMEOUT_MS = 15_000;

const index = JSON.parse(
  readFileSync(join(__dirname, '../../storybook-static/index.json'), 'utf8')
) as {entries: Record<string, IndexEntry>};

/** `templates-list--phone-dark` is the screen `templates-list`; `…--desktop-with-notice` is `templates-list-with-notice`. */
const screenOf = (id: string): string => {
  const [kind, variant = ''] = id.split('--');
  const state = variant.replace(/^(phone|desktop)-?/, '').replace(/-?dark$/, '');
  return state ? `${kind}-${state}` : kind;
};

const stories = Object.values(index.entries)
  .filter(entry => entry.type === 'story' && entry.id.startsWith(GOLDEN_PREFIX))
  .map(entry => entry.id);

const firstStoryOf = new Map<string, string>();
for (const id of stories) {
  if (!firstStoryOf.has(screenOf(id))) {
    firstStoryOf.set(screenOf(id), id);
  }
}

const routes: RouteScanRoute[] = [...firstStoryOf].map(([name, id]) => ({
  name,
  url: ({scheme}) => `/iframe.html?id=${id}&viewMode=story&globals=theme:${scheme}`,
  ready: async page => {
    await page
      .locator('cmn-page[data-cmn-page]')
      .waitFor({state: 'visible', timeout: STORY_READY_TIMEOUT_MS});
  },
}));

// The screens the page templates have a golden for, written out by hand: the oracle the catalog is
// checked against, independent of how `screenOf` reads a story id. A new template or state is added
// here on purpose, so a story that would be merged into another screen, or that no one meant to
// scan, fails instead of passing quietly.
const GOLDEN_SCREENS = [
  'templates-detail',
  'templates-detail-with-tiles',
  'templates-detail-with-verdict',
  'templates-form',
  'templates-list',
  'templates-list-with-app-chrome',
  'templates-list-with-notice',
  'templates-overview',
  'templates-overview-with-long-body',
  'templates-settings',
  'templates-whats-new',
  'templates-whats-new-with-badge',
];
const GOLDEN_STORY =
  /^templates-(detail|form|list|overview|settings)--(phone|desktop)(-dark)?$|^templates-detail--(phone|desktop)-with-(tiles|verdict)(-dark)?$|^templates-list--(phone|desktop)-with-(notice|app-chrome)$|^templates-overview--desktop-with-long-body$|^templates-whats-new--(phone|desktop)(-with-badge)?(-dark)?$/;

test('the scan covers every golden story', () => {
  expect(stories.filter(id => !GOLDEN_STORY.test(id))).toEqual([]);
  expect(routes.map(route => route.name).sort()).toEqual(GOLDEN_SCREENS);
});

defineRouteScans({test, expect}, {routes});
