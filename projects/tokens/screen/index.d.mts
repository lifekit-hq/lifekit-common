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
  waitForFunction(
    fn: (arg: any) => unknown, // eslint-disable-line @typescript-eslint/no-explicit-any
    arg?: unknown,
    options?: {timeout?: number}
  ): Promise<unknown>;
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

export type BaselineSize = 'phone' | 'desktop';
export type BaselineScheme = 'light' | 'dark';

/** What a route's callbacks are told about the capture they belong to. */
export interface BaselineVariant {
  size: BaselineSize;
  scheme: BaselineScheme;
}

/** The part of Playwright's `toHaveScreenshot` options a route may set (the rest is the fixture's). */
export interface CaptureBaselineOptions {
  /** Capture the whole scrolling page, not the viewport (default false: the screen as shown). */
  fullPage?: boolean;
  /** Locators painted over before the comparison: anything that changes between runs. */
  mask?: unknown[];
  /** Loosens the exact comparison (default 0) for one screen; an exception, say why next to it. */
  maxDiffPixelRatio?: number;
  /** How long settling may take, in ms (default 10000). */
  timeout?: number;
}

/** One route of an app. `page` is Playwright's `Page`. */
export interface BaselineRoute {
  /** Names the baseline files (`<name>-<size>-<scheme>`); unique within the call. */
  name: string;
  /** The route to open, or a function of the capture when the URL carries the scheme. */
  url: string | ((variant: BaselineVariant) => string);
  /** Runs before navigation: register the route's mocks, pin the clock. */
  prepare?: (page: any, variant: BaselineVariant) => Promise<void> | void;
  /** Runs after navigation: wait for what proves the route's data has rendered. */
  ready?: (page: any, variant: BaselineVariant) => Promise<void> | void;
  /** Locators to mask (a version number, a relative timestamp). */
  mask?: (page: any) => unknown[];
  fullPage?: boolean;
  /** Loosens the comparison for every screen of the route; an exception, say why next to it. */
  maxDiffPixelRatio?: number;
  /**
   * Loosens the comparison for single screens, keyed by baseline name without `.png`
   * (`<name>-<size>-<scheme>`); wins over `maxDiffPixelRatio`. An exception, say why next to it.
   */
  screenMaxDiffPixelRatio?: Record<string, number>;
}

export interface DefineBaselinesOptions {
  routes: BaselineRoute[];
  /** Default both schemes. */
  schemes?: readonly BaselineScheme[];
  /** Default both sizes. */
  sizes?: readonly BaselineSize[];
}

export declare const BASELINE_PLATFORM: 'linux';
export declare const BASELINE_SCHEMES: readonly BaselineScheme[];
export declare const BASELINE_SIZES: readonly BaselineSize[];
export declare const SCREEN_BASELINE_OPTIONS: Readonly<{
  animations: 'disabled';
  caret: 'hide';
  scale: 'css';
  maxDiffPixelRatio: 0;
  threshold: 0;
}>;

/** The Playwright config the fixture owns (`updateSnapshots: 'none'` and the capture options). */
export declare function screenBaselineConfig(): {
  updateSnapshots: 'none';
  expect: {toHaveScreenshot: typeof SCREEN_BASELINE_OPTIONS};
};
export declare function screenBaselineName(variant: BaselineVariant & {name: string}): string;
export declare function captureScreenBaseline(
  page: ScreenPage,
  expectation: {toHaveScreenshot(name: string, options?: object): Promise<void>},
  file: string,
  options?: CaptureBaselineOptions
): Promise<void>;
export declare function defineScreenBaselines(
  playwright: {test: any; expect: any},
  options: DefineBaselinesOptions
): void;

export type SkeletonRuleId = 'K0' | 'K1' | 'K2';

export interface SkeletonRule {
  id: SkeletonRuleId;
  name: string;
  /** The sentence the rule enforces. */
  says: string;
}

export interface SkeletonFinding {
  rule: SkeletonRuleId;
  message: string;
}

/** A top-level section of the page and its box, in document pixels. */
export interface SkeletonSection {
  /** Its `data-cmn-section` name, else its 1-based position (`#2`): how the two states pair up. */
  key: string;
  label: string;
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A held request the check can release: the part of Playwright's `Route` it drives. */
export interface SkeletonRoute {
  fallback(): Promise<void>;
}

/** The part of a Playwright `Page` the skeleton check drives. */
export interface SkeletonPage extends ScreenPage {
  goto(
    url: string,
    options?: {waitUntil?: 'domcontentloaded' | 'load' | 'commit'}
  ): Promise<unknown>;
  route(
    url: string | RegExp | ((url: URL) => boolean),
    handler: (route: SkeletonRoute) => unknown
  ): Promise<void>;
  unroute(
    url: string | RegExp | ((url: URL) => boolean),
    handler?: (route: SkeletonRoute) => unknown
  ): Promise<void>;
}

export interface CheckSkeletonOptions {
  /** The route to visit. */
  url: string;
  /** Matcher (Playwright glob, RegExp or predicate) for the data requests to hold while the skeleton is measured. */
  hold: string | RegExp | ((url: URL) => boolean);
  /** How far a skeleton section may sit from its loaded section, in px per edge (default 8). */
  tolerance?: number;
  /** Rules to skip, each with a reason recorded where the app calls the check. */
  ignore?: SkeletonRuleId[];
  /** CSS selector for the sections to compare, instead of the page template's column children. */
  sections?: string | null;
  /** How long waiting for the skeleton, and for the loaded page to settle, may take, in ms (default 10000). */
  timeout?: number;
}

export interface SkeletonResult {
  url: string;
  /** How many requests matched `hold` and were parked. */
  held: number;
  tolerance: number;
  skeleton: SkeletonSection[];
  loaded: SkeletonSection[];
  findings: SkeletonFinding[];
}

export declare const SKELETON_RULES: readonly SkeletonRule[];
export declare const SKELETON_TOLERANCE_PX: 8;

export declare function measureSections(options?: {selector?: string | null}): SkeletonSection[];
export declare function compareSections(
  skeleton: SkeletonSection[],
  loaded: SkeletonSection[],
  options?: {tolerance?: number; ignore?: SkeletonRuleId[]}
): SkeletonFinding[];
export declare function checkSkeleton(
  page: SkeletonPage,
  options: CheckSkeletonOptions
): Promise<SkeletonResult>;
export declare function formatSkeleton(result: SkeletonResult): string;
