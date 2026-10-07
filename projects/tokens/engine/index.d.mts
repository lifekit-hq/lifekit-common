/** Types for @lifekit-hq/tokens/engine (the implementation is plain ES modules). */

export type ThemeMode = 'light' | 'dark';
export type ContrastLevel = 'standard' | 'more';
export type SeedVariant = 'light' | 'dark' | 'light-more' | 'dark-more';
export type StatusName = 'info' | 'success' | 'warning' | 'error';

export interface Oklch {
  L: number;
  C: number;
  H: number;
}

/** A theme: one colour and how far it tints the surfaces (0-1). */
export interface SeedChoice {
  seed: string;
  intensity: number;
}

export interface DeriveOptions {
  seed: string;
  intensity?: number;
  mode?: ThemeMode;
  contrast?: ContrastLevel;
}

export interface SeedWarning {
  code: 'near-status';
  status: Exclude<StatusName, 'info'>;
  message: string;
}

export interface DerivedPalette {
  /** Token name without the `--color-` prefix -> `#rrggbb`. */
  tokens: Record<string, string>;
  warnings: SeedWarning[];
  seed: Oklch & {hex: string};
}

/** Custom-property name (`--color-…`) -> `#rrggbb`. */
export type SeedDeclarations = Record<string, string>;

export function normalizeHex(value: unknown): string | null;
export function hexToOklch(hex: string): Oklch;
export function oklchToHex(colour: Oklch): string;
export function luminance(hex: string): number;
export function contrastRatio(a: string, b: string): number;
export function mix(fg: string, bg: string, alpha: number): string;
export function hueDistance(a: number, b: number): number;

export const STATUS_HUES: Readonly<Record<StatusName, number>>;
export const STATUS_TINT_ALPHA: number;
export const NEAR_HUE_DEGREES: number;
export function derive(options: DeriveOptions): DerivedPalette;
export function toDeclarations(tokens: Record<string, string>): SeedDeclarations;
export function toCss(selector: string, tokens: Record<string, string>, indent?: string): string;

export const DEFAULT_INTENSITY: number;
export const INTENSITY_STOPS: Readonly<{quiet: number; tinted: number; immersive: number}>;
/** Colours with a fixed meaning (asset classes, gain/loss, in/out): no seed rewrites them. */
export const FIXED_COLOUR_NAMES: readonly string[];

export const APP_SEEDS: Readonly<
  Record<'fs' | 'lk' | 'dc', Readonly<{name: string; seed: string; intensity: number}>>
>;
export const PRESETS: readonly Readonly<{id: string; name: string; seed: string}>[];

export const SEED_STORAGE_KEY: 'cmn-theme-seed';
export const SEED_CACHE_VERSION: number;
export const SEED_VARIANTS: readonly SeedVariant[];
export function seedVariant(mode: ThemeMode, contrast?: ContrastLevel): SeedVariant;
export function normalizeSeedChoice(
  choice: Partial<SeedChoice> | null | undefined
): SeedChoice | null;
export function seedVariants(choice: Partial<SeedChoice>): Record<SeedVariant, SeedDeclarations>;
export function readStoredSeed(storage: Pick<Storage, 'getItem'>): SeedChoice | null;
export function storeSeed(
  storage: Pick<Storage, 'setItem'>,
  choice: Partial<SeedChoice>
): Record<SeedVariant, SeedDeclarations>;
export function clearStoredSeed(storage: Pick<Storage, 'removeItem'>): void;
export function seedTokenNames(): readonly string[];
export function applySeedDeclarations(
  element: {style: Pick<CSSStyleDeclaration, 'setProperty'>},
  declarations: SeedDeclarations
): void;
export function clearSeedDeclarations(element: {
  style: Pick<CSSStyleDeclaration, 'removeProperty'>;
}): void;
