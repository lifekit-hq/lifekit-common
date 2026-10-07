import {expect, type Page} from '@playwright/test';

export type Theme = 'light' | 'dark';

// The preview decorator (.storybook/preview.ts) writes `data-theme` from the `theme` global on every
// story render, so a spec that flips the attribute after `goto` races that render and loses.
// Asking Storybook for the global is the only way the theme survives the render.
export async function openStory(page: Page, id: string, theme: Theme): Promise<void> {
  await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}
