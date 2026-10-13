# App-shell standard

What every lifekit app shell does the same way: where an option lives, what Settings looks like, what
the profile menu holds, and what the phone shows. Decided 2026-10-13 after a survey of finance-sentry,
devclaw, lifekit-dashboard and backstage, all of which already sit on `cmn-app-layout`. The frame is
shared; this document fixes what each app leaves to itself today.

`docs/PHONE-CONTRACT.md` is the contract for the phone frame (tabs, top bar, sheets, safe areas). This
document is the contract for the account and settings surface inside it.

## Status

| Part                                                                  | Where                                    | Status                                |
| --------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------- |
| Preference tiers, `devicePreference`, `accountPreferencesStore`       | `@lifekit-hq/core/preferences`           | Built                                 |
| Save-failure toast wiring                                             | `provideToastPreferenceErrors()` in `ui` | Built                                 |
| `cmn-segmented`, `cmn-appearance-settings`, palette System/Light/Dark | `ui`                                     | Target (reads the Account tier below) |
| `showThemeToggle` default `false`                                     | `cmn-app-layout`                         | Target                                |
| `cmn-settings-section`, `cmn-setting-row`, `cmn-danger-zone`          | `ui`                                     | Target                                |
| Identity header, `accountMenu()`, `accountOnPhone`, `cmn-more-page`   | `ui`                                     | Target                                |
| `lifekit-theme-sync`, `APP_SEEDS.bs`                                  | `tokens`                                 | Target                                |

Every app migrates to the standard in its own PR after the library parts land. Until an app has, the
rules below describe where it is going, not where it is.

## 1. Three preference tiers

Every option belongs to exactly one tier. The tier fixes where it is stored, how it saves and where it
shows in Settings, so "where does this option go?" has one answer.

| Tier          | What belongs there                                                                                                                        | Storage                                                                                                         | Saves                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Device**    | Last tab, dismissed hints, per-device push opt-in: anything that is true of this browser and not of the person                            | `localStorage`, through `devicePreference`. Keys are `cmn-*` (shell) or `lk.<app>.*` (app)                      | At once, on change                                              |
| **Account**   | Appearance (theme mode, seed colour, intensity), name, base currency, locale, notification toggles, app-domain prefs that follow the user | The app's own server, per user, behind `GET` and `PATCH /api/me/preferences`, through `accountPreferencesStore` | Toggles and selects at once; text forms with a per-section Save |
| **Workspace** | App or instance configuration that affects everyone: backstage Agency, devclaw Dispatch, finance-sentry People                            | The app's own server, admin-only, its own endpoints                                                             | Per-section Save                                                |

Rules that follow:

- An option has one tier. Do not mirror a server option in `localStorage` as a second source of truth.
  The one deliberate exception is the appearance cache in section 2.
- Account preferences do not cross apps. Each app keeps its own copy, so a currency set in
  finance-sentry does not reach backstage. A suite-wide preference service was considered and not
  chosen; revisit it only when an option is truly suite-wide.
- Workspace sections come after the personal ones and are titled with the workspace or instance name.

## 2. Appearance is an Account preference

Theme mode and seed colour are per user and synced across that user's devices **within each app**,
not across apps. Each app keeps its own seed default from `APP_SEEDS`.

The server carries only the choices:

```json
{"appearance": {"theme": "system", "seed": "#175a6d", "intensity": 0.5}}
```

- `theme` is `'system' | 'light' | 'dark'`. `system` is the default and follows the OS live.
- `seed` and `intensity` are optional. Absent means the app's own default seed and the engine's
  default intensity. Store the seed (`#rrggbb`) and intensity (0-1) and never the derived CSS: each
  client re-derives the palette with the tokens engine.

Load order, so the page never flashes the wrong theme and the server still has the last word:

1. The pre-paint script (`@lifekit-hq/tokens/brand/theme-script`) paints from the `ThemeService`
   `localStorage` keys (`cmn-theme`, `cmn-theme-seed`). That cache is a paint-speed device, not a
   second preference.
2. After sign-in the app calls `load()` on its preferences store. When it answers, the server
   `appearance` is applied through `ThemeService`, and the cache is updated to match. **The server
   value wins.**
3. A change made in Settings or the palette writes to both: the optimistic store patch (which
   `PATCH`es the server) and `ThemeService` (which updates the cache and the page at once).
4. On sign-out call `clear()` on the store. Leave the cache: it is what the sign-in page paints from.

The appearance control's caption is "Synced to your account". A signed-out surface (a login page)
only has the cache, so it follows the last theme used on this device.

## 3. The shared code

### `devicePreference<T>(key, default, options?)`

A signal backed by `LOCAL_STORAGE`, JSON-encoded. Call it in an injection context.

```ts
import {devicePreference} from '@lifekit-hq/core/preferences';

class Sidebar {
  protected readonly collapsed = devicePreference('lk.fns.sidebarCollapsed', false);

  protected toggle(): void {
    this.collapsed.update(value => !value);
  }
}
```

- The key type is `` `cmn-${string}` | `lk.${string}.${string}` ``. Use `cmn-` only for what the shared
  shell stores; apps use `lk.<app>.`.
- Tolerant by design: storage that throws (private mode, quota, blocked), text that is not JSON, and
  a value of the wrong shape all fall back to the default, and the signal keeps working in memory.
  Pass `validate` for enums and objects; the default check compares only the JSON shape.
- Read once at creation and not live across tabs. `reset()` removes the key.

`LOCAL_STORAGE` is the single storage token for the whole library. `@lifekit-hq/ui` re-exports the
same token, so providing it once swaps storage for `ThemeService`, the shell and `devicePreference`.

### `accountPreferencesStore<P>(endpoint?)`

A signal store over the uniform preferences resource. `endpoint` defaults to
`ACCOUNT_PREFERENCES_ENDPOINT` (`/api/me/preferences`) and is used as given.

```ts
import {type AccountPreferences, accountPreferencesStore} from '@lifekit-hq/core/preferences';

interface FinancePreferences extends AccountPreferences {
  baseCurrency: string;
}

export const FinancePreferencesStore = accountPreferencesStore<FinancePreferences>();
```

| Member                        | What                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `preferences()`               | Full object with unsaved changes applied; `null` until the first load                                        |
| `appearance()`                | `preferences()?.appearance ?? null`. What L1 reads                                                           |
| `isLoaded()`, `isSaving()`    | Server copy read; at least one change applied locally and not yet confirmed                                  |
| `status()`, `hasError()`, ... | Load request state (`withAsyncStatus`); also `isLoading`, `errorCode`, `errorMessage`                        |
| `load()`                      | Fetches once and shares the in-flight request; a failed load is retried on the next call                     |
| `reload()`                    | Fetches again and keeps the current view while it loads                                                      |
| `patch(partial)`              | Optimistic change of top-level fields; resolves `true` when confirmed, `false` after rollback; never rejects |
| `patchAppearance(change)`     | `patch` for appearance: merged over the current one, the whole appearance is sent. `seed: undefined` resets  |
| `clear()`                     | Forgets the loaded copy (sign-out)                                                                           |

Behaviour worth knowing:

- Saves go out **one at a time, in order**. A response replaces the confirmed copy, and the view is that
  copy with the still-pending changes laid over it.
- A failed save drops **only its own change** from the view (later pending changes stay), then calls
  `PREFERENCE_SAVE_ERROR_HANDLER` with `{error, errorCode, fields}`. The store sits below the UI, so it
  does not toast itself: add `provideToastPreferenceErrors()` from `@lifekit-hq/ui` once, or provide
  your own handler.
- `patchAppearance` before the first load starts from `DEFAULT_APPEARANCE` (`{theme: 'system'}`).
- The store is `providedIn: 'root'`. Provide `HttpClient` as usual.

L1 (`cmn-appearance-settings`) needs exactly two things from it: read `appearance()`, and call
`patchAppearance({theme})` or `patchAppearance({seed, intensity})`.

### The server contract

```
GET   /api/me/preferences  ->  200 { appearance: {...}, ...appFields }
PATCH /api/me/preferences  <-  { appearance?: {...}, ...anyAppFieldSubset }
                           ->  200 { ...the full object after the change }
```

- `GET` always returns every field, with `appearance.theme` defaulted to `system` for a new user.
- `PATCH` takes any subset of top-level fields. A present field **replaces** the stored one wholesale
  (an `appearance` object is written as a whole, so an omitted `seed` clears it); an omitted field is
  untouched. It is not a deep merge.
- `PATCH` returns the **full** object, so the client never has to merge a partial response.
- An invalid value answers `4xx`; the body may carry an `errorCode`, which the store passes to the
  error handler.
- The resource is the signed-in user's own. Apps whose identity comes from a gateway (oauth2-proxy)
  key it by the identity the gateway asserts.

An app that already has a profile endpoint (finance-sentry `GET`/`PUT /profile`) can serve this shape
as an alias first and move its fields over.

## 4. Settings page

One route, `/settings`, titled "Settings". Sub-pages are `/settings/<x>` with `parent: '/settings'`.
Settings is never a phone tab: it is reached from the account menu on desktop and tablet, from the
More page on a phone, and from the command palette.

Sections, in this order. An app includes only the ones that apply.

1. **Account**: identity (name, email, avatar). Read-only in an app behind a gateway; editable where
   the app owns the profile.
2. **Appearance**: theme mode (System / Light / Dark) and the seed colour picker, the same in every app
   (`cmn-appearance-settings`). Every app has the colour picker; none locks its brand colour.
3. **Notifications**: the push opt-in and the app's own alert toggles.
4. **App-specific sections**: finance-sentry Preferences and Financial independence, backstage
   Agency and Extension tokens, devclaw Dispatch.
5. **Security, People, admin** links.
6. **About**: version, What's new, links.
7. **Danger zone**, then **Sign out**.

Personal sections (Account tier) come before Workspace sections.

### Save model

- **Toggles, selects and pickers apply immediately**, with the optimistic store patch and an error
  toast on failure. They have no Save button.
- **Multi-field text forms get a Save button per section**, not one per page.
- There is no page-level Save. It is what let finance-sentry's theme apply only after Save.

## 5. Account menu (the profile icon)

On desktop and tablet the avatar opens a menu with:

1. an **identity header**: name and email, not interactive
2. **Settings**
3. app extras (finance-sentry's What's new)
4. a separator
5. **Sign out**, destructive

The label is **"Sign out"** everywhere. Not "Log out".

## 6. Phone

- **Every app has a More tab.** The More page is the phone's account surface: overflow navigation, an
  account card with the email, Settings, app extras, the version and Sign out.
- The avatar is **not shown on the phone top bar**. The More page replaces it.
- Settings is reachable from More, and from nothing that is a tab.
- Appearance follows the system setting by default; the override is in Settings, as the phone
  contract already says.

## 7. Theme controls

- **No theme toggle in the top bar.** The library default for `showThemeToggle` is `false`; Settings
  is the home of the override. The toggle could only flip between light and dark and pin the result,
  so it could never go back to System.
- The command palette offers three entries, **Appearance: System**, **Light** and **Dark**, each
  calling `setPreference`, so System stays reachable.
- A palette or Settings change goes through the paths in section 2: cache and server together.

## What this standard does not cover

- **A shared auth client** (the OIDC BFF and the gateway flavours) is a separate, later track.
- **Cross-app preference sync** needs a central preference service, which was not chosen.
- **Per-app migration** is each app's own work, in its own repository.

## Decision record

Decided 2026-10-13. Answers as given: `Q1: B · Q2: user · Q3: more · Q4: remove · Q5: immediate ·
Q6: later · Q7: sign-out · Q8: all`.

| Q   | Decision                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Three tiers (Device, Account, Workspace) with small shared helpers; not a UI kit alone, not a central service                      |
| Q2  | Appearance is per user and synced within each app: Account tier, `ThemeService` `localStorage` as the pre-paint cache, server wins |
| Q3  | On a phone the account surface is a More page; every app gets a More tab                                                           |
| Q4  | No top-bar theme toggle; the palette offers System, Light and Dark                                                                 |
| Q5  | Toggles and selects apply immediately; text forms get a per-section Save                                                           |
| Q6  | The shared auth client is a separate later track                                                                                   |
| Q7  | The label is "Sign out"                                                                                                            |
| Q8  | Every app's Appearance includes the seed colour picker                                                                             |
