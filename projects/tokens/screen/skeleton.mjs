/**
 * The skeleton-conformance check: a page's loading state must lay out like its loaded state.
 *
 * `checkSkeleton(page, {url, hold})` visits a route with its data requests held, so the page stays
 * in its skeleton state, measures the page's top-level sections, releases the requests, waits for
 * the page to settle and measures the sections again. A section whose box moved or resized by more
 * than the tolerance (8px, the same bar `skeleton-conformance.stories.ts` holds each preset to), or
 * a section that appeared or vanished, is a finding: the skeleton drifted from the page it stands
 * in for, which until now was only caught by eye. See docs/SCREEN-CHECK.md.
 *
 *   import {checkSkeleton, formatSkeleton} from '@lifekit-hq/tokens/screen';
 *
 *   test('now: skeleton matches the page', async ({page}) => {
 *     await mockApi(page);
 *     const result = await checkSkeleton(page, {url: '/now', hold: '**\/api/**'});
 *     expect(result.findings, formatSkeleton(result)).toEqual([]);
 *   });
 *
 * It needs no Playwright import of its own: it drives the `page` it is handed.
 */
import {
  DEFAULT_SETTLE_TIMEOUT_MS,
  LOADING_SELECTOR,
  settleScreen,
  waitForQuietDom,
} from './settle.mjs';

/** How far a skeleton section may sit from its loaded section, per edge and per size. */
export const SKELETON_TOLERANCE_PX = 8;

/** Each rule, its short name and the sentence it enforces. */
export const SKELETON_RULES = [
  {
    id: 'K0',
    name: 'skeleton-state',
    says: 'A page with data to wait for shows a skeleton while it waits, and drops it when the data lands.',
  },
  {
    id: 'K1',
    name: 'section-set',
    says: 'The skeleton stands in for every top-level section the loaded page has, and adds none.',
  },
  {
    id: 'K2',
    name: 'section-box',
    says: 'Guardrail S1: each skeleton section sits within 8px of the loaded section it stands in for.',
  },
];

/**
 * Runs in the browser: the page's top-level sections and their boxes in document coordinates.
 *
 * Sections are the blocks a page template lays out (the children of every `[data-cmn-page-column]`,
 * looking through `display: contents`), or the visible children of `main` without a template, or
 * the elements `selector` names. A section is paired across the two states by its
 * `data-cmn-section` name when it has one, else by its position.
 *
 * @param {{selector?: string | null}} [options]
 * @returns {{key: string, label: string, left: number, top: number, width: number, height: number}[]}
 */
export function measureSections(options = {}) {
  const NAME_TEXT = 28;
  const vis = el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  const blocksOf = container => {
    const out = [];
    for (const child of container.children) {
      if (getComputedStyle(child).display === 'contents') out.push(...blocksOf(child));
      else if (vis(child)) out.push(child);
    }
    return out;
  };
  const main = document.querySelector('main') || document.body;
  const columns = [...main.querySelectorAll('[data-cmn-page-column]')].filter(vis);
  let sections;
  if (options.selector) sections = [...document.querySelectorAll(options.selector)].filter(vis);
  else if (columns.length) sections = columns.flatMap(blocksOf);
  else sections = blocksOf(main);
  const round = n => Math.round(n * 10) / 10;
  return sections.map((el, index) => {
    const r = el.getBoundingClientRect();
    const tag = el.tagName.toLowerCase();
    const name = el.getAttribute('data-cmn-section');
    const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, NAME_TEXT);
    return {
      key: name || `#${index + 1}`,
      label: name ? `${tag}[${name}]` : `${tag} #${index + 1}`,
      text,
      left: round(r.left + window.scrollX),
      top: round(r.top + window.scrollY),
      width: round(r.width),
      height: round(r.height),
    };
  });
}

const EDGES = ['top', 'left', 'width', 'height'];
const round = n => Math.round(n * 10) / 10;

/**
 * Compares the skeleton state's sections with the loaded state's. Pure, so it runs anywhere.
 *
 * @param {import('./index.d.mts').SkeletonSection[]} skeleton
 * @param {import('./index.d.mts').SkeletonSection[]} loaded
 * @param {{tolerance?: number, ignore?: import('./index.d.mts').SkeletonRuleId[]}} [options]
 * @returns {import('./index.d.mts').SkeletonFinding[]}
 */
export function compareSections(
  skeleton,
  loaded,
  {tolerance = SKELETON_TOLERANCE_PX, ignore = []} = {}
) {
  const skip = new Set(ignore);
  const findings = [];
  const add = (rule, message) => {
    if (!skip.has(rule)) findings.push({rule, message});
  };
  const byKey = new Map(skeleton.map(section => [section.key, section]));
  const seen = new Set();
  for (const section of loaded) {
    const stand = byKey.get(section.key);
    if (!stand) {
      add('K1', `the skeleton has no stand-in for ${section.label} (${section.height}px tall)`);
      continue;
    }
    seen.add(section.key);
    const off = EDGES.map(edge => ({
      edge,
      by: Math.abs(stand[edge] - section[edge]),
      stand: stand[edge],
      real: section[edge],
    })).filter(({by}) => by > tolerance);
    if (off.length) {
      const detail = off.map(
        ({edge, by, stand: s, real}) => `${edge} ${s}px vs ${real}px (${round(by)}px off)`
      );
      add('K2', `${section.label}: ${detail.join(', ')}; allowed ${tolerance}px`);
    }
  }
  for (const section of skeleton) {
    if (!seen.has(section.key)) {
      add('K1', `the skeleton draws ${section.label} that the loaded page does not have`);
    }
  }
  return findings;
}

const isTimeout = error => error?.name === 'TimeoutError';

/**
 * Checks `url`'s skeleton state against its loaded state.
 *
 * Requests matching `hold` (any Playwright URL matcher: a glob, a RegExp or a predicate) are parked
 * until the skeleton has been measured, then released to whatever would have answered them: the
 * app's own `page.route` mocks registered earlier, or the network. Register those mocks first.
 * The viewport is the caller's (`test.use(SCREEN_VIEWPORTS.phone)`), as for `checkScreen`.
 *
 * @param {import('./index.d.mts').SkeletonPage} page
 * @param {import('./index.d.mts').CheckSkeletonOptions} options
 * @returns {Promise<import('./index.d.mts').SkeletonResult>}
 */
export async function checkSkeleton(
  page,
  {
    url,
    hold,
    tolerance = SKELETON_TOLERANCE_PX,
    ignore = [],
    sections = null,
    timeout = DEFAULT_SETTLE_TIMEOUT_MS,
  }
) {
  if (!url) throw new Error('checkSkeleton needs the route to visit as `url`');
  if (!hold)
    throw new Error('checkSkeleton needs `hold`, a URL matcher for the data requests to hold');
  const skip = new Set(ignore);
  const findings = [];
  const add = (rule, message) => {
    if (!skip.has(rule)) findings.push({rule, message});
  };

  const held = [];
  let released = false;
  const handler = route => (released ? route.fallback() : held.push(route));
  await page.route(hold, handler);
  let skeleton = [];
  let loaded = [];
  try {
    await page.goto(url, {waitUntil: 'domcontentloaded'});

    let showed = true;
    try {
      await page.waitForFunction(
        selector =>
          document.fonts.status === 'loaded' &&
          [...document.querySelectorAll(selector)].some(el => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          }),
        LOADING_SELECTOR,
        {timeout}
      );
    } catch (error) {
      if (!isTimeout(error)) throw error;
      showed = false;
    }
    if (!held.length) {
      add('K0', 'no request matched `hold`, so the page was never kept waiting for data');
    }
    if (!showed) {
      add(
        'K0',
        'nothing on screen was loading with the data held (no cmn-skeleton, [aria-busy="true"] or [data-cmn-loading])'
      );
    }
    await waitForQuietDom(page, timeout);
    skeleton = await page.evaluate(measureSections, {selector: sections});

    released = true;
    await Promise.all(held.map(route => route.fallback()));
    try {
      await settleScreen(page, {timeout});
      loaded = await page.evaluate(measureSections, {selector: sections});
    } catch (error) {
      if (!isTimeout(error)) throw error;
      add('K0', 'the page was still loading after the held data was released');
    }
  } finally {
    released = true;
    await page.unroute(hold, handler).catch(() => undefined);
  }

  if (loaded.length || !findings.some(finding => finding.rule === 'K0')) {
    findings.push(...compareSections(skeleton, loaded, {tolerance, ignore}));
  }
  return {url: page.url(), held: held.length, tolerance, skeleton, loaded, findings};
}

/** One line per finding, prefixed by the rule's id and name, under a header naming the route. */
export function formatSkeleton({url, held, skeleton, loaded, findings}) {
  const head = `${url} [${skeleton.length} skeleton / ${loaded.length} loaded sections, ${held} request(s) held]: ${findings.length} skeleton finding(s)`;
  const names = new Map(SKELETON_RULES.map(rule => [rule.id, rule.name]));
  return [
    head,
    ...findings.map(({rule, message}) => `  ${rule} ${names.get(rule)}: ${message}`),
  ].join('\n');
}
