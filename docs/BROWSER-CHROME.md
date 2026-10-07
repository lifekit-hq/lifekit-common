# Browser chrome standard

Every lifekit web app ships the same browser chrome: tab title, tab icon, install icons,
`theme-color`, web manifest and font. It's all one family, so a user with several lifekit apps
open sees the same tile and can tell the apps apart by the two letters on it.

Everything comes from `@lifekit-hq/tokens`:

| What                       | Where                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------- |
| Colours                    | `@lifekit-hq/tokens/theme.css` (the only source)                                       |
| Icon files, per app        | `@lifekit-hq/tokens/brand/<app>/` (on disk: `brand/dist/<app>/`; generated, see below) |
| Head template              | `@lifekit-hq/tokens/brand/head.html`                                                   |
| Manifest fields            | `@lifekit-hq/tokens/brand/manifest.fragment.json`                                      |
| Node helpers + drift check | `@lifekit-hq/tokens/brand`, `lifekit-chrome-check` (bin)                               |
| Vite plugin                | `@lifekit-hq/tokens/brand/vite`                                                        |
| IBM Plex Sans / Mono       | `@lifekit-hq/tokens/fonts.css`                                                         |

This page covers what the browser shows around the app. How the app itself behaves on a phone
(top bar, back, tabs, sheets, states) is the [phone app contract](PHONE-CONTRACT.md).

Apps never commit copies of icon files or colours. They import the package and add the head lines
below. A mark or colour change then ships as a lifekit-common release and reaches every app on its
next build.

## The mark

The mark is a lowercase two-letter monogram in white (`--color-text-inverse`) on the lifekit petrol
tile (`--color-accent-700` `#175a6d`, corner radius 7 on a 32-unit grid). The tile is the family
and the letters name the app:

| `<app>` | Apps                           |
| ------- | ------------------------------ |
| `lk`    | Lifekit, the lifekit dashboard |
| `fs`    | Finance Sentry                 |
| `dc`    | Devclaw                        |

The mark is pure geometry with no `<text>`, so it renders identically as a favicon, where web
fonts never load. Stems sit on whole grid units, which keeps them crisp at 16 px.

**One source.** `projects/tokens/brand/mark.mjs` holds the tile and every app's glyph, with
colours passed in as parameters (read from `theme.css`; never literals). Every other file is derived
from it by `projects/tokens/scripts/build-brand.mjs`, which runs on `npm run build` and on
`prepack`, so every published tarball carries fresh output. Generated files are never committed
or hand-edited.

**Adding an app** means adding one glyph entry to `mark.mjs`: two letters drawn on the 32 grid
with stems on whole units, kept inside the safe zone (the build tests check it). Everything else
follows from the build.

## Title

`{Page} · {App}`, for example `Accounts · Finance Sentry`. The landing route uses the bare app
name.

- The app name goes last so a narrow tab still shows the page.
- The separator is a middle dot `·` with a space on each side.
- Set the title per route: an Angular `TitleStrategy`, or `document.title` in React.
- The static `index.html` title is the bare app name. Inner routes must never keep it.

```ts
// Angular: provide {provide: TitleStrategy, useClass: AppTitleStrategy}
@Injectable({providedIn: 'root'})
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  public override updateTitle(snapshot: RouterStateSnapshot): void {
    const page = this.buildTitle(snapshot);
    this.title.setTitle(page ? `${page} · ${APP_NAME}` : APP_NAME);
  }
}
```

## Icon set

Every app serves these files from its site root:

| File                    | Spec                                                                                 | Why                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `favicon.svg`           | The mark, 32-unit viewBox.                                                           | Primary tab icon, sharp at every density.                                              |
| `favicon.ico`           | 16 + 32 px PNGs inside.                                                              | Fallback for browsers and tools without SVG favicons, and for `/favicon.ico` probes.   |
| `apple-touch-icon.png`  | 180×180, **opaque, full-bleed**: tile colour to the edges, glyph scaled ×4, centred. | iOS home screen. iOS rounds the corners itself, and transparency would render black.   |
| `icon-192.png`          | The mark (rounded tile, transparent corners).                                        | Manifest `purpose: any`: install prompt, desktop launchers.                            |
| `icon-512.png`          | The mark (rounded tile, transparent corners).                                        | Manifest `purpose: any`: splash screen, app stores.                                    |
| `icon-maskable-512.png` | Full-bleed like the touch icon, glyph inside the central 80% safe zone.              | Manifest `purpose: maskable`: Android crops it to circle or squircle without clipping. |

## theme-color

```html
<meta name="theme-color" content="#f3f5f6" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0c1113" media="(prefers-color-scheme: dark)" />
```

These are `--color-surface-bg` for the light and dark themes. The browser bar blends into the page
and the icon carries the brand; a petrol bar over the dark UI would be loud.

The media queries follow the OS only. `ThemeService` (`@lifekit-hq/ui`) closes the gap: whenever
it applies a theme, whether from a toggle, a stored choice or an OS change, it points every
`theme-color` meta at the active `--color-surface-bg`. Apps write no sync code of their own.

## Manifest (`manifest.webmanifest`)

| Field                      | Value                                         |
| -------------------------- | --------------------------------------------- |
| `name`                     | The app name (= the landing-route title)      |
| `short_name`               | ≤ 12 characters, so it is never truncated     |
| `id`, `start_url`, `scope` | `/`, or the base path the app is served under |
| `display`                  | `standalone`                                  |
| `theme_color`              | `#f3f5f6` (the light `theme-color`)           |
| `background_color`         | `#f3f5f6` (`--color-surface-bg`, light)       |
| `icons`                    | the three manifest icons above, and no others |

Off-token colours are not allowed. Other fields (`description`, `lang`, `shortcuts`, …) are fine.
`brandManifest({name, shortName})` from `@lifekit-hq/tokens/brand` builds this object, and
`manifest.fragment.json` holds the fixed fields for static manifests.

An app served under a sub-path (the devclaw console at `/console/`) passes that base path, and
`id`, `start_url` and `scope` all become it. The value is normalised to `/segment/` form
(`console` and `/console` both give `/console/`); anything that is not a plain path (a URL, a
query, `..`, whitespace) is rejected. The manifest icons follow it too: each `src` is prefixed with
the base path (`/console/icon-192.png`), so they resolve inside the scope. With the default `/` the
output is unchanged.

```js
brandManifest({name: 'Devclaw', basePath: '/console/'});
// id, start_url, scope: '/console/'; icons: '/console/icon-192.png', …
```

The static `manifest.fragment.json` always carries the default `/`; set those three fields and the
icon `src`s by hand in a static manifest. The icon files themselves stay at the root of the build
output, which is served under the base path.

## Head template

This is `@lifekit-hq/tokens/brand/head.html` with its `{App}` placeholder filled in. Place it
after `<meta charset>`:

```html
<title>Finance Sentry</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="color-scheme" content="light dark" />
<meta name="theme-color" content="#f3f5f6" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0c1113" media="(prefers-color-scheme: dark)" />
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.webmanifest" />
```

An app served under a base path prefixes the four link `href`s with it
(`/console/favicon.ico`, …); `headMarkup({title, basePath})` emits that form, and the generated
`head.html` is the root form shown above.

- `viewport-fit=cover` lets the app pad for notches with `env(safe-area-inset-*)`. Never lock zoom.
- `color-scheme: light dark` gives native controls and scrollbars the right scheme before CSS loads.
- `sizes="32x32"` on the ICO stops Chrome from choosing it over the SVG.
- No other icon links, and no `data:,` placeholder.

Add the pre-paint theme script too, so the first paint already has the stored or OS theme. Never
copy it by hand: `@lifekit-hq/tokens` ships it, along with the hash your CSP needs.

```text
<script>/* the contents of @lifekit-hq/tokens/brand/theme-init.js, unedited, no added whitespace */</script>
```

- **Inline it from the package.** `brand/theme-init.js` is the exact script (the tag content is the file, byte for byte). `themeScriptTag()` and
  `THEME_SCRIPT` from `@lifekit-hq/tokens/brand` give the same text for a build step or Vite
  `transformIndexHtml`.
- **Pin its hash in the CSP.** `brand/theme-init.csp-hash.txt` (or `themeScriptCspHash()`) is the
  `script-src` source expression, e.g. `'sha256-…'`. The hash covers the exact bytes between the
  tags, which are the bytes of `theme-init.js`, so inline the file unedited. The hash only
  changes in a release that edits the script, and the release notes say so. Compare the pinned
  value against the package in CI and bump both together.
- **What it does.** It reads the `cmn-theme` key `ThemeService` writes (`light` | `dark`), falls
  back to the OS `prefers-color-scheme`, and sets `data-theme` on `<html>`. No stored choice means
  the `system` preference, which `ThemeService` then follows live.

## Fonts and tokens

- IBM Plex Sans is the token font: `--font-sans` in `theme.css`, and the Tailwind `font-base`,
  `font-headline` and `font-label` families. Load it by importing
  `@lifekit-hq/tokens/fonts.css` once in the global stylesheet. It self-hosts variable Plex Sans
  (`@fontsource-variable/ibm-plex-sans`, weights 100–700, normal and italic), and per-script
  `unicode-range` files mean a browser downloads only the subsets a page renders. Without it, every
  app falls back to `system-ui`. Never load fonts from a CDN.
- Mono is IBM Plex Mono (`--font-mono`, regular and medium, same `fonts.css`), for code only.
- Colours come only from `@lifekit-hq/tokens/theme.css`, with Tailwind via
  `@lifekit-hq/tokens/tailwind`. The brand colour is `--color-accent-700` (`#175a6d`).

```css
/* global stylesheet */
@import '@lifekit-hq/tokens/fonts.css';
@import '@lifekit-hq/tokens/theme.css';
```

## Adopting it in an app

**Angular** (`angular.json`, build `assets`): serve the app's icon directory from the package at
the site root.

```json
{"glob": "**/*", "input": "node_modules/@lifekit-hq/tokens/brand/dist/fs", "output": "/"}
```

Keep a `manifest.webmanifest` with the fields above, and put the head template in `index.html`.

**Vite**: the plugin serves the icons in dev, emits them into the build, and can emit the
manifest too. If another plugin owns the manifest (for example vite-plugin-pwa), leave out
`manifest` and pass that plugin `brandManifest(…)`.

```ts
import {lifekitBrand} from '@lifekit-hq/tokens/brand/vite';

export default defineConfig({
  plugins: [lifekitBrand({app: 'lk', manifest: {name: 'Lifekit', shortName: 'Lifekit'}})],
});
```

## Drift check

`lifekit-chrome-check` (a bin of `@lifekit-hq/tokens`) checks an app's **built output** against
this standard. Run it in CI after the build:

```bash
npx lifekit-chrome-check --app fs --name "Finance Sentry" dist/finance-sentry/browser
```

An app served under a sub-path adds `--base-path` (default `/`), which is the expected `id`,
`start_url` and `scope`, and the prefix every head link `href` and manifest icon `src` must
resolve to (`/console/favicon.ico`). A relative URL resolves against the base path, so
`favicon.ico` passes and a root-absolute `/favicon.ico` fails. A malformed value exits 2:

```bash
npx lifekit-chrome-check --app dc --name "Devclaw" --base-path /console/ dist/console/browser
```

It fails (exit 1) and lists every deviation:

- **head**: the title is not the bare app name, the viewport, `color-scheme` or either
  `theme-color` is missing or wrong, or a required link is missing or an extra one is present;
- **manifest**: an off-token colour, wrong `display`/`id`/`start_url`/`scope`, a long
  `short_name`, or an icon list that is not exactly the standard three;
- **icons**: a served icon file is missing or differs by a single byte from the one this version
  of the package generated. That catches stale, hand-edited and other-app icons.

The same checks are available as functions from `@lifekit-hq/tokens/brand`: `checkBrowserChrome`,
`checkHead`, `checkManifest` and `checkIcons`. `checkBrowserChrome`, `checkHead` and
`checkManifest` take `{basePath}`. Each returns `{rule, message}[]`, empty when the app
complies, for use inside an app's own test suite.
