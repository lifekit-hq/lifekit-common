# lifekit-common

Shared lifekit design system and Angular component library.

| Package              | What it is                                                                                             | Consumers                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `@lifekit-hq/tokens` | Design tokens — CSS custom properties (`theme.css`, light/dark) + Tailwind preset. Framework-agnostic. | Every lifekit frontend (Angular and React) |
| `@lifekit-hq/ui`     | Angular component library (`cmn-*` selectors), developed Storybook-first                               | Angular apps (finance-sentry)              |
| `@lifekit-hq/core`   | Angular signal-store features and helpers                                                              | Angular apps                               |
| `@lifekit-hq/config` | Shared tooling presets — ESLint, Prettier, Stylelint, base tsconfig                                    | lifekit repos (build-time only)            |

Extracted from [finance-sentry](https://github.com/lifekit-hq/finance-sentry) (`frontend/projects/dsdevq-common`) per lifekit-common#1.

## Development

```bash
npm ci
npm run storybook   # the primary dev loop (after the ui port lands)
```

## Testing

`npm run test` runs the unit suites for all four buildable packages through
`@angular/build:unit-test` (Vitest) **in headless Chromium**. The `pretest` script fetches the
browser binary first, so the one command is self-sufficient locally and on CI.

**Why a real browser is the default.** This is a design system: components size themselves from
layout, charts paint to `<canvas>` through Chart.js, and the Lit elements in
`@lifekit-hq/elements` live in shadow DOM styled entirely by CSS custom properties. jsdom has no
layout engine and no `ResizeObserver`, so those are exactly the behaviours it cannot observe —
under jsdom we either left them unasserted or stubbed the platform until the assertion went
vacuous. Chromium costs about six seconds more on the largest suite (`ui`: 51s → 57s), which is a
cheap price for tests that run in the environment the packages actually ship into.

The suites briefly ran under jsdom, with a no-op `ResizeObserver` stub, because a build sandbox
of the day had no Chromium. That was an environment workaround rather than a decision about the
library, and it is reverted: there is no jsdom configuration left to fall back to.

Browser-rendered proof above the unit layer lives in Playwright suites under `projects/ui/e2e/`
(`playwright.smoke.config.ts` against the built Storybook bundle, `playwright.config.ts` for
visual regression). Those run against the catalog, not the sources, and are not part of
`npm run test`.

## PWA checklist

Installable, offline-tolerant apps use Angular's own `@angular/pwa` / `@angular/service-worker` —
Angular owns the service worker. This repo owns the shared pieces on top of it:

- `AppUpdateService` from `@lifekit-hq/core/pwa` (optional peer: `@angular/service-worker`) —
  exposes an `updateReady` signal, `reload()`, and checks for updates when the app returns to the
  foreground.
- `<lk-update-prompt>`, `<lk-offline-banner>` and `<lk-install-hint>` from
  `@lifekit-hq/elements`.

Each app owns its own `manifest.webmanifest`, icons, colours, URL rules and server config.
Before shipping an app as a PWA, check:

- [ ] **Keep Angular's `assetGroups`.** The generated `ngsw-config.json` caches the app shell
      (HTML, JS, CSS, icons). Don't replace it with a hand-rolled strategy.
- [ ] **Exclude every backend-served navigable path in `navigationUrls`.** The service worker
      answers navigation requests with `index.html`. Any path the server renders itself (auth
      callbacks, file downloads, health pages) must be listed as a `"!/path/**"` exclusion, or the
      app shell will shadow it.
- [ ] **No `dataGroups` over authenticated or personal data** unless that is a deliberate,
      reviewed decision. The default is: cache the shell, never the data.
- [ ] **Serve `ngsw-worker.js` with `Cache-Control: no-cache`**, never `immutable` and never with
      a long max-age. A stale worker script means clients never learn that an update exists.
- [ ] **Set `viewport-fit=cover` and pad for the safe area.** Use
      `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
      and `env(safe-area-inset-*)` padding on fixed headers, footers and tab bars so notches and
      home indicators don't cover content.
