# Service worker

Every lifekit app registers the Angular service worker the same way, so it ships once in
`@lifekit-hq/core/pwa`. The worker caches the app shell so the app opens offline and can be
installed. It never caches data.

## `provideLifekitServiceWorker`

```ts
import {provideLifekitServiceWorker} from '@lifekit-hq/core/pwa';

export const appConfig: ApplicationConfig = {
  providers: [provideLifekitServiceWorker()],
};
```

| Option    | Default            | Meaning                                                                    |
| --------- | ------------------ | -------------------------------------------------------------------------- |
| `script`  | `'ngsw-worker.js'` | Worker script URL. A push-aware wrapper (for example `'sw.js'`) goes here. |
| `enabled` | `!isDevMode()`     | Register the worker. On in production builds, off under the dev server.    |

Fixed, not options: `registrationStrategy: 'registerWhenStable:30000'` (register once the app
settles, or after 30 s, so first paint is never delayed) and `updateViaCache: 'none'` (the browser
never serves the worker script from the HTTP cache, so an update is always noticed).

Needs the optional peer `@angular/service-worker`, the `serviceWorker` option in `angular.json`
pointing at the config below, and a manifest.

### Dev and demo switch

The dev server has no worker, which keeps stale caches out of day-to-day work. To demo the
install, offline and update pieces (`lk-install-hint`, `lk-offline-banner`, `lk-update-prompt`)
locally, pass `enabled` from an app-owned flag, or serve a production build:

```ts
provideLifekitServiceWorker({enabled: environment.demoServiceWorker || undefined});
```

`undefined` falls back to the default, so the flag only forces the worker on.

### With push

`PushSubscriptionService` talks to the registered worker through `SwPush`, so push and the worker
are one decision. An app that handles push events ships its own wrapper script that runs
`importScripts('ngsw-worker.js')` and then adds its `push` / `notificationclick` handlers; it passes
that wrapper as `script`. Apps without push use the default.

## `ngsw-config.json` template

[`docs/templates/ngsw-config.json`](templates/ngsw-config.json) is the starting point: **precache
only, never a feed.**

- `app` prefetches the shell (HTML, JS, CSS, manifest, favicon) at install.
- `assets` caches images and fonts lazily, refreshed with each version.
- There is no `dataGroups`. API responses are never cached; offline, the app shows its shell and
  `lk-offline-banner`, not stale personal data. Adding `dataGroups` over authenticated data is a
  reviewed decision, not a default.
- `navigationUrls` sends navigations to `index.html`. Add a `"!/path/**"` entry for every path the
  server renders itself (auth callbacks, downloads, health pages), or the shell shadows it.

Copy it to the app's `ngsw-config.json`; the only expected edits are those navigation exclusions
and extra files the app adds to the shell. Serve `ngsw-worker.js` with `Cache-Control: no-cache`.
See the PWA checklist in the [README](../README.md).
