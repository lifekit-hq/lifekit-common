# @lifekit-hq/core

Angular signal-store features and helpers for the lifekit apps (`withAsyncStatus`,
`withUrlSync`, `ApiService`, …), plus the framework-free
`@lifekit-hq/core/format` and the `@lifekit-hq/core/pwa` entry points, and
`@lifekit-hq/core/preferences` (device and account preference storage).

## `withAsyncStatus`

Request status for a store: `status` (`'idle' | 'loading' | 'success' | 'error'`) and `errorCode`,
with the `isLoading`, `hasError` and `errorMessage` computeds and `setLoading()`, `setSuccess()`,
`setError(code)` and `setIdle()`. `errorMessage` resolves the code through `ErrorMessageService` and
falls back to `defaultErrorMessage` (default: "Something went wrong. Please try again.").

```ts
signalStore(withAsyncStatus({defaultErrorMessage: 'Could not load accounts.'}));
```

### Several requests in one store: `withNamedAsyncStatus`

`withNamedAsyncStatus(name, config?)` is the same feature with every member prefixed by `name`, so one
store can track independent requests, each with its own status, error code and message. Call it once
per request with a distinct name; the features compose like any other `signalStoreFeature`.

```ts
signalStore(
  withNamedAsyncStatus('profile'),
  withNamedAsyncStatus('events', {defaultErrorMessage: 'Could not load events.'})
);
// profileStatus, profileErrorCode, isProfileLoading, hasProfileError, profileErrorMessage,
// setProfileLoading, setProfileSuccess, setProfileError(code), setProfileIdle
// eventsStatus, eventsErrorCode, isEventsLoading, hasEventsError, eventsErrorMessage, …
```

The name is the state field prefix (`profileStatus`) and, capitalised, the infix in computeds and
methods (`isProfileLoading`, `setProfileLoading`). It must be a string literal so the members are
typed, and two features in one store need different names (or they overwrite each other).

## `withUrlSync`

Two-way sync between store state and the query string. Each schema entry maps one state field to one
query param. A param equal to its `default` is left out of the URL.

```ts
signalStore(
  withState<LedgerState>(INITIAL),
  withUrlSync<LedgerState>({
    query: {param: 'q', default: ''},
    page: {param: 'page', default: 1, codec: 'number'},
    'filters.category': {param: 'category', default: [], codec: 'csv'},
    'filters.type': {param: 'type', default: ''},
  })
);
```

### Nested fields

A key is a state field (`query`) or a dot path into an object field (`'filters.category'`), so one
`filters` object can be spread over several flat params (`?category=food,travel&type=debit`). Writing
a nested param replaces only that path; its sibling fields are kept.

### Codecs

`codec` is `'string'` (default), `'number'`, `'boolean'`, `'csv'` or your own `{encode, decode}`.

- `'csv'` maps a `string[]` to one comma-separated param (`?category=a,b`). On read it also accepts
  repeated params (`?category=a&category=b`) and merges them with any CSV values; empty items are
  dropped.
- A custom codec may add `decodeAll(raw: readonly string[])` to read every occurrence of a repeated
  param. Without it only the first occurrence is read.

### Following the URL

The URL is read when the store is created and again on every later `queryParamMap` change, so
navigating on the same, reused route (`/transactions?type=debit` → `/transactions?type=credit`)
updates the state. After init, a param absent from the URL resets its field to the schema `default`;
at init it leaves the initial state untouched. The feature's own URL writes (`replaceUrl: true`) are
not read back.

## `TabPreloadStrategy`

A router preloading strategy for the tab-bar destinations, so the first visit to a tab does not wait
for its lazy chunk. A route opts in with `data: {tabPreload: true}`; every other lazy route loads on
demand, as it does without a strategy.

```ts
export const APP_ROUTES: Routes = [
  {path: 'budgets', data: {tabPreload: true}, loadComponent: () => import('./budgets')},
  {path: 'settings', loadComponent: () => import('./settings')}, // on demand
];

provideRouter(APP_ROUTES, withPreloading(TabPreloadStrategy), withViewTransitions());
```

A chunk loads on an idle moment after the first navigation has painted (two animation frames, then
`requestIdleCallback` with a 4s timeout, a timer where that is missing), never during startup. It
does not load at all when the reader asked to save data (`saveData`), the connection is metered
(`type === 'cellular'`) or slow (`2g`), and it checks again at the idle moment in case that changed
while it waited. The Network Information API does not exist in Safari, so on iOS (where these apps
run installed) the tabs always preload: nothing can be known, and the chunks are small.

## `@lifekit-hq/core/preferences`

Where an option is stored, by tier. The tiers and the server contract are in
[`docs/APP-SHELL-STANDARD.md`](../../docs/APP-SHELL-STANDARD.md).

- `devicePreference<T>(key, default, options?)` is a signal backed by `LOCAL_STORAGE` for options that
  belong to this browser. Keys are `cmn-*` or `lk.<app>.*`. Storage that throws or holds a bad value
  falls back to the default; the signal keeps working in memory.
- `accountPreferencesStore<P>(endpoint?)` is a signal store over `GET` and `PATCH
/api/me/preferences`: it loads once, applies each `patch` at once, saves in order and rolls a
  failed change back, reporting through `PREFERENCE_SAVE_ERROR_HANDLER` (`provideToastPreferenceErrors()`
  in `@lifekit-hq/ui` turns that into a toast). In an Angular app change appearance through
  `AppearanceService` from `@lifekit-hq/ui`, which writes the theme cache and this store together
  (`provideAppearanceSync(Store)`); `patchAppearance` is for code that has no theme cache.
- `AccountPreferences` and `AppearancePreference` (`{theme: 'system' | 'light' | 'dark', seed?,
intensity?}`, choices only, never derived CSS) are the shared types; an app extends
  `AccountPreferences` with its own fields.

```ts
export const AppPreferencesStore = accountPreferencesStore<AppPreferences>();

const prefs = inject(AppPreferencesStore);
await prefs.load();
await prefs.patchAppearance({theme: 'dark'}); // resolves false after a rollback, never rejects
```
