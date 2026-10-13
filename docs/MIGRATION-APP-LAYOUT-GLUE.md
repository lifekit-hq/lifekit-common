# Migration: `cmn-app-layout` owns the app-shell glue

**Breaking** (`feat(ui)!`). `cmn-app-layout` now owns the appearance actions, the command palette and
Cmd/Ctrl-K, the active route, and the avatar account. Apps that upgrade must delete the glue they
used to carry, or it runs twice (the theme flips back, two palettes open).

## Remove from the app shell

- The `(themeToggle)` handler that calls `ThemeService.toggle()` — the layout changes the
  appearance itself, through `AppearanceService`, so the local cache and the account are written
  together. `themeToggle` is still emitted, as a notification only. The top-bar toggle is off by
  default (`showThemeToggle`); the override lives in `cmn-appearance-settings`.
- The `(searchClick)` handler that opens the palette — the layout opens it itself. `searchClick`
  is still emitted, as a notification only.
- The `window:keydown` Cmd/Ctrl-K listener and its `openPalette()` with the
  `CmnDialogBareContainerComponent` dialog config.
- The `ThemeService.activeTheme$` signal and the `isDark` computed. The `isDark` input is gone;
  leaving `[isDark]="…"` bound fails at AOT compile time.
- The router URL signal and `activeRoute` computed. Omit `[activeRoute]` and the layout derives it
  from the router (longest nav route that matches on a path-segment boundary); pass it only to
  override.
- The palette `_theme` action handler — the layout handles the appearance actions itself
  (`_theme:system`, `_theme:light`, `_theme:dark`). `_theme` is deprecated: it flips light and dark
  and can never go back to System. Other palette actions still arrive on `(paletteAction)`.

## Pass instead

- `[paletteItems]` — the palette entries (page entries navigate; actions go to `paletteAction`).
  Spread `APPEARANCE_PALETTE_ITEMS` into it for "Appearance: System / Light / Dark"; drop any
  `_theme` entry.
- `[account]="{label, menuItems}"` — `label` is initials, a name, or an email; the top bar reduces
  it to initials. `avatarLabel` and `avatarMenuItems` are deprecated and go once both apps pass
  `account`; `account` takes precedence.
- `[navItems]` and `[brand]` as before.

## Sync appearance to the account

Add `provideAppearanceSync(YourPreferencesStore)` to the app providers (the store is an
`accountPreferencesStore()` class from `@lifekit-hq/core/preferences`). `AppearanceService` then
writes every mode and colour change to `PATCH /api/me/preferences`, and the server's `appearance`
wins after sign-in. Without it the choice stays on the device and
`cmn-appearance-settings` says "On this device". See `docs/APP-SHELL-STANDARD.md`.
