# Migration: `cmn-app-layout` owns the app-shell glue

**Breaking** (`feat(ui)!`). `cmn-app-layout` now owns the theme toggle, the command palette and
Cmd/Ctrl-K, the active route, and the avatar account. Apps that upgrade must delete the glue they
used to carry, or it runs twice (the theme flips back, two palettes open).

## Remove from the app shell

- The `(themeToggle)` handler that calls `ThemeService.toggle()` — the layout toggles the theme
  itself. `themeToggle` is still emitted, as a notification only.
- The `(searchClick)` handler that opens the palette — the layout opens it itself. `searchClick`
  is still emitted, as a notification only.
- The `window:keydown` Cmd/Ctrl-K listener and its `openPalette()` with the
  `CmnDialogBareContainerComponent` dialog config.
- The `ThemeService.activeTheme$` signal and the `isDark` computed. The `isDark` input is gone;
  leaving `[isDark]="…"` bound fails at AOT compile time.
- The router URL signal and `activeRoute` computed. Omit `[activeRoute]` and the layout derives it
  from the router (longest nav route that matches on a path-segment boundary); pass it only to
  override.
- The palette `_theme` action handler — the layout handles `_theme` itself. Other palette actions
  still arrive on `(paletteAction)`.

## Pass instead

- `[paletteItems]` — the palette entries (page entries navigate; actions go to `paletteAction`).
- `[account]="{label, menuItems}"` — `label` is initials, a name, or an email; the top bar reduces
  it to initials. `avatarLabel` and `avatarMenuItems` are deprecated and go once both apps pass
  `account`; `account` takes precedence.
- `[navItems]` and `[brand]` as before.
