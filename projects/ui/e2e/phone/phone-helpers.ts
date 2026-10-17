import {expect, type Page, test} from '@playwright/test';

// Shared by the phone suites. How a violation counts is described at the head of
// phone-conformance.spec.ts.

export const MIN_TARGET = 44;
const LABEL_LENGTH = 24;

export const GATING = process.env['PHONE_CONFORMANCE'] === 'gate';

export type Theme = 'light' | 'dark';

export const layoutStory = (story: string): string => `components-app-layout--${story}`;
export const LAYOUT_READY = 'cmn-app-layout > div';
export const TARGETS_READY = 'cmn-touch-targets';

export async function openStory(
  page: Page,
  storyId: string,
  theme: Theme = 'light',
  ready: string = LAYOUT_READY
): Promise<void> {
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story&globals=theme:${theme}`);
  await page.waitForSelector(ready, {state: 'visible'});
}

export type CheckMode = 'gate' | 'enforce' | 'advisory';

/** Records violations; fails by the check's mode (see the head of this file). */
export function report(violations: string[], mode: CheckMode = 'gate'): void {
  for (const detail of violations) {
    test.info().annotations.push({type: 'violation', description: detail});
  }
  if (mode === 'enforce' || (mode === 'gate' && GATING)) {
    expect(violations).toEqual([]);
  }
}

/** Interactive controls that measure under `min` px in either direction, hit-slop included. */
export async function undersizedTargets(page: Page, min: number): Promise<string[]> {
  return page.evaluate(
    ([limit, labelLength]) => {
      const found: string[] = [];
      const selector = 'button, a[href], [role=button], [role=tab], input, select';
      for (const el of document.querySelectorAll(selector)) {
        const r = el.getBoundingClientRect();
        // A control may press wider than it draws: `.cmn-hit-slop` paints its target in ::after
        const slop = getComputedStyle(el, '::after');
        const slopped = slop.content !== 'none' && slop.position === 'absolute';
        const width = Math.max(r.width, slopped ? parseFloat(slop.width) : 0);
        const height = Math.max(r.height, slopped ? parseFloat(slop.height) : 0);
        if (r.width && r.height && (width < limit || height < limit)) {
          const label = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim();
          found.push(
            `${el.tagName.toLowerCase()}[${label.slice(0, labelLength)}] ${Math.round(width)}x${Math.round(height)}`
          );
        }
      }
      return found;
    },
    [min, LABEL_LENGTH] as const
  );
}

/** Waits two frames, so measured insets and sticky offsets have settled. */
export async function settleFrames(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
}
