/** Types for @lifekit-hq/tokens/screen (the implementation is plain ES modules). */

export type ScreenRuleId =
  'C0' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7' | 'C8' | 'C9' | 'C10';

export interface ScreenRule {
  id: ScreenRuleId;
  name: string;
  /** The DESIGN.md or HIG sentence the rule enforces. */
  says: string;
}

export interface ScreenFinding {
  rule: ScreenRuleId;
  message: string;
}

export interface ScreenInspection {
  /** The template kind the page declares (or the one passed in), null without a template. */
  kind: string | null;
  /** The screen is built on a page template (`cmn-page`). */
  template: boolean;
  findings: ScreenFinding[];
}

export interface ScreenResult extends ScreenInspection {
  url: string;
}

export interface InspectScreenOptions {
  /** Overrides the kind the page declares. */
  kind?: string | null;
  /** Rules to skip, each with a reason recorded where the app calls the check. */
  ignore?: ScreenRuleId[];
}

export interface CheckScreenOptions extends InspectScreenOptions {
  /** Wait for fonts, skeletons and busy regions first (default true). */
  settle?: boolean;
  /** How long settling may take, in ms (default 10000). */
  timeout?: number;
}

/** The part of a Playwright `Page` the check drives (typed loosely so any Playwright fits). */
export interface ScreenPage {
  url(): string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Playwright's own parameter type
  evaluate(fn: (arg: any) => unknown, arg?: unknown): Promise<unknown>;
  waitForFunction(fn: () => unknown, arg?: unknown, options?: {timeout?: number}): Promise<unknown>;
}

/** Playwright `test.use` options for each size every route is checked at. */
export interface ScreenViewport {
  viewport: {width: number; height: number};
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
}

export declare const SCREEN_RULES: readonly ScreenRule[];
export declare const SCREEN_VIEWPORTS: Readonly<{phone: ScreenViewport; desktop: ScreenViewport}>;

export declare function inspectScreen(options?: InspectScreenOptions): ScreenInspection;
export declare function settleScreen(page: ScreenPage, options?: {timeout?: number}): Promise<void>;
export declare function checkScreen(
  page: ScreenPage,
  options?: CheckScreenOptions
): Promise<ScreenResult>;
export declare function formatScreen(result: ScreenResult): string;
