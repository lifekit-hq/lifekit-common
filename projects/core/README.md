# @lifekit-hq/core

Angular signal-store features and helpers for the lifekit apps (`withAsyncStatus`,
`withUrlSync`, `ApiService`, …), plus the framework-free
`@lifekit-hq/core/format` and the `@lifekit-hq/core/pwa` entry points.

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
