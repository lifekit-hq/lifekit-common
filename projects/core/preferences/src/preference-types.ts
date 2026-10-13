/** What the user chose for light/dark: an explicit theme, or `system` to follow the OS live. */
export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * A user's appearance, as the server stores it. Only the choices: `seed` and `intensity` are inputs
 * to the tokens engine, never the derived CSS, so every client re-derives the palette itself.
 */
export interface AppearancePreference {
  theme: ThemeMode;
  /** Brand seed colour as `#rrggbb`. Absent means the app's own default seed (`APP_SEEDS`). */
  seed?: string;
  /** How far the seed tints surfaces, 0-1. Absent means the engine default. */
  intensity?: number;
}

/** The appearance a user has before choosing anything: follow the OS, the app's own seed. */
export const DEFAULT_APPEARANCE: Readonly<AppearancePreference> = {theme: 'system'};

/**
 * The account tier's body: what `GET /api/me/preferences` returns and `PATCH` accepts a subset of.
 * An app adds its own per-user fields by extending this interface.
 */
export interface AccountPreferences {
  appearance: AppearancePreference;
}

/** The standard path of the account preferences resource, on the app's own server. */
export const ACCOUNT_PREFERENCES_ENDPOINT = '/api/me/preferences';
