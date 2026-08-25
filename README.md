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
