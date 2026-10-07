# Phone app contract

How a lifekit web app behaves on a phone, as one page. The shell (`cmn-app-layout` and its parts)
guarantees the chrome and the behaviour around it; a page only declares what is its own. This is
the mobile chapter of the [UX continuity policy](STRATEGY.md#ux-continuity-policy): where the policy
already rules (loading, empty, error, page frame), the policy wins and this page adapts it. The
browser-level chrome (tab title, icons, `theme-color`, manifest) is the
[browser chrome standard](BROWSER-CHROME.md).

## Decisions behind it

- **PWA only.** A Home Screen web app, no native wrapper. Haptics, widgets and background refresh
  are accepted losses.
- **One structure, the iOS one, in the Instrument look.** Back chevron on the left, a large title
  that shrinks into the bar, sheets with half and full stops. No per-platform modes. Material 3
  accepts the same structure (title, back, tabs and sheets map one to one).
- **The shell and `cmn-*` stay Angular**, built on Angular Aria and the CDK. `lk-*` elements are
  only for framework-free leaves such as the install, offline and update prompts (see the
  [layered substrate rule](STRATEGY.md#layered-substrate-rule)).
- **No financial data on the device.** The service worker caches the app shell only. Old numbers
  stay visible while refreshing, in memory, for the length of a session.

## What the shell guarantees

A page gets all of this without writing any code for it.

| Area           | Guarantee                                                                                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tab bar        | Navigation only, 3-5 destinations, one-word labels that never truncate, always visible except under a sheet. The last tab, More, opens a page the app builds, never a sheet. Badges for critical info only. |
| Tab state      | Each tab remembers its last screen. Launch restores the last tab. Re-tapping the active tab scrolls to top, then pops to the tab root.                                                                      |
| Top bar        | Owns the title, the back chevron (no "Back" text) and a trailing actions slot. The page's large title shrinks into the bar on scroll. No page renders its own back button or title.                         |
| Back           | Back goes to the route's `parent`, or to history when there is none. A deep link to a detail still has a way up. The system swipe back works and is never overridden.                                       |
| Scroll         | The shell owns the scroller. Back restores the scroll position. Overscroll does not chain to the browser (`overscroll-behavior-y: contain`).                                                                |
| Sheets         | One sheet implementation, `cmn-drawer`: half and full stops, a grabber (tap cycles the stops), drag to dismiss, opens at most half height. Do not open two at once.                                         |
| Overlays       | Install hint, offline banner and update prompt sit in the content area, below the top bar. They never cover the top bar or the tab bar. The floating action hides while a sheet is open.                    |
| Touch          | 44pt hit areas for every chrome control. Chrome text is not selectable. Keyboard hints are hidden on touch (`(hover: none)`).                                                                               |
| Safe areas     | Top bar, tab bar and sheets pad `env(safe-area-inset-*)`.                                                                                                                                                   |
| Layout by size | Under 600px: tab bar. 600-839px: collapsed sidebar as a rail. 840px and up: sidebar. A landscape phone (short, coarse pointer) keeps the tab bar.                                                           |
| Appearance     | Follows the system light or dark setting by default. The override lives in Settings. `theme-color` matches the surface, per the browser chrome standard.                                                    |
| Motion         | Brief and purposeful. Everything fades or stops under Reduce Motion.                                                                                                                                        |

Below 360px, a page with two or more actions loses the top bar's theme toggle so the title stays
readable. The app must offer the theme override in Settings.

Below 360px, a page with more than two actions keeps only its first action inline and moves the
rest into a "More actions" menu (Angular CDK menu: arrow keys, Escape, focus returns to the
trigger). Each item keeps its action id, `route` and `disabled`. With back, search and avatar the
title keeps at least 64px at 320px and 359px. From 360px every action stays inline and the theme
toggle stays visible; with three actions the title there is about 28px.

### Scroll and tab state

The shell does this itself, in `cmn-app-layout`, with no page code and no router feature to enable
(the router's `withInMemoryScrolling` only sees the window, and the scroller here is `<main>`):

- **Back and forward** restore the scroll of the screen they return to. Any other navigation
  starts a new screen at the top; a change of query or fragment only keeps the scroll. A restore
  waits for content that loads late, and gives way as soon as the reader scrolls.
- **Each tab remembers its last screen**, scrolled where it was left, for the session.
- **Re-tapping the active tab** scrolls to the top; once there, a second tap pops to the tab root
  and the tab forgets the popped screen. Under Reduce Motion the scroll is instant.
- **Launch restores the last tab.** The last tab is kept in `localStorage` (`cmn-last-tab`, ignored
  when storage is blocked) and reopened when the app starts at `/`. A deep link is never
  redirected.
- `<main>` sets `overscroll-behavior-y: contain`, and the top bar, tab bar and sidebar are not
  text-selectable.

On the phone tab bar `navClick` is a notification: the shell does the navigating. An app that also
navigates on that event fights the shell (a re-tap would pop to the root before it can scroll to the
top), so it should drop that handler. The sidebar still leaves navigating to the app.

### The More tab

In the phone shell (under 600px, or a landscape phone) the tab bar shows up to four destinations and, when the app sets `moreRoute`, a last
**More** tab. More is an ordinary page that the app declares as a route and fills itself; the shell
supplies no content for it.

```html
<cmn-app-layout [navItems]="navItems" [tabRoutes]="tabRoutes" moreRoute="/more">
  <router-outlet />
</cmn-app-layout>
```

```ts
{path: 'more', component: MorePage, data: {title: 'More'}}
```

- The More page is a tab root: it shows its `title` and no back chevron, remembers its scroll, and a
  re-tap scrolls to top, then pops to the root, like any other tab.
- The More tab is highlighted on the More page and on any nav item that is not a tab. It shows a dot
  while any of those items has a badge.
- Nav items left off `tabRoutes` stay in the sidebar or rail. On a phone they are reached
  from the More page, which links to them. Pages reached from More set `parent: '/more'`.
- Without `moreRoute` there is no More tab, and a nav item beyond the fourth is not reachable from
  the tab bar.

## What a page declares

Pages declare these in route data and templates. No per-page header, back or sheet code.

```ts
// Typed as PageChromeData from @lifekit-hq/ui. A page reacts to its actions through
// CmnPageActionsService: inject(CmnPageActionsService).on('add').
{path: 'accounts', component: AccountsPage, data: {title: 'Accounts', actions: [{id: 'add', label: 'Add account', icon: 'Plus'}]}},
{path: 'accounts/:id', component: AccountPage, data: {title: 'Account', parent: '/accounts'}},
```

A route that declares none of these keeps the layout's `title` input and gets no back chevron.

| Declaration | Rule                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`     | Under 15 characters. Shown once: in the top bar and as the large title, never repeated in the content.                                                  |
| `parent`    | The route the back chevron returns to. Required on every page that is not a tab root.                                                                   |
| `actions`   | Trailing top-bar actions, at most a few. Anything a gesture can do also has a visible control.                                                          |
| Detail kind | A quick look opens a **sheet**. A full record **pushes a page** with back. Do not mix the two for the same kind of record.                              |
| States      | Wrap async content in the state pattern below. A page never builds its own loading, empty or error markup.                                              |
| Fields      | Forms use `cmn-form-field`. Money fields set `inputmode="decimal"`, every field sets `enterkeyhint`, and `autocomplete` is set where the kind is known. |

### Sheet or page

| Use a sheet when                                          | Use a page when                                         |
| --------------------------------------------------------- | ------------------------------------------------------- |
| The user peeks at one record and returns to the same list | The record has its own sections, actions or a deep link |
| The task is short, one decision or a few fields           | The task needs the keyboard and scrolling for a while   |
| Nothing in it needs to be linked to or restored           | The user may arrive from a notification or a shared URL |

Sheets that hold input ask for confirmation before a swipe dismisses unsaved changes. An alert has
at most three buttons. A destination in the tab bar is a page, never a sheet.

### State pattern

`cmn-async-state` covers every state, built on the policy's rules (skeletons, loading is not
empty, keep cached data, errors keep context). A page binds `status`, `isEmpty`, `offline` and
`lastSynced`, sets `retryable` and handles `(retry)`:

```html
<cmn-async-state
  [status]="status()"
  [isEmpty]="rows().length === 0"
  [offline]="offline()"
  [lastSynced]="lastSynced()"
  retryable
  (retry)="reload()"
>
  <!-- the content -->
</cmn-async-state>
```

Offline beats error, and error beats empty, so a failed or offline load never reads as "no data".

| State   | Shows                                                                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading | A skeleton shaped like the content, the old content while refreshing.                                                                                  |
| Empty   | Only after a successful load with no results. Explains the section and offers action.                                                                  |
| Error   | In place of the skeleton on a first load, a banner over the last good data otherwise. Always with Retry. Never shown as empty.                         |
| Offline | What still works, plus the time of the last sync. Never blocks content, never covers the chrome. A banner over content, or a panel when there is none. |

## Forms and notifications

- Keyboard matches content, validation happens as people type, and an error says how to fix it.
- Push (when it ships) asks for permission after an in-context explainer, has an in-app settings
  page, shows an app-icon badge for unread alerts, and keeps amounts out of the notification text.
- Sign-in is never asked for again while a session is valid. Passkeys are supported when the
  identity provider offers them.

## Accessibility and performance floor

- Targets 44x44pt (28 at the very minimum), body text 17pt where the layout allows and 11pt as the
  floor, 200% text size supported, contrast 4.5:1.
- A cold first load stays within Core Web Vitals "good": LCP at most 2.5 s, INP at most 200 ms,
  CLS at most 0.1.
- Haptics are not possible in an iOS PWA and are not part of the contract.

## Status

The contract is the target. The shell reaches it step by step, and each step adds a check to the
phone conformance suite (`npm run test:phone`, report-only until `PHONE_CONFORMANCE=gate`), so a
guarantee above is only gating once its check exists.

| Guarantee                               | Status                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Tab bar, sheets, safe areas             | Built: one sheet (`cmn-drawer`) with half and full stops, More is a page; no suite check yet      |
| Top bar title, back, actions            | Built: route data `title`, `parent`, `actions`; the suite checks the title at 320                 |
| Shell-owned scroll and tab state        | Built: checked by the suite's "back restores scroll"; see "Scroll and tab state"                  |
| One state pattern                       | Built: `cmn-async-state`; the suite checks the offline and error states at 320 and 390            |
| Touch size (44pt chrome, labels, hints) | Built: `--size-touch`, `.cmn-hit-slop`; the suite enforces 44x44 at 390x844, labels at 320, hints |
| Layout by size                          | Built: `CmnShellService` picks tab bar, rail or sidebar; the suite checks each width and device   |
| Overlays, appearance                    | Target                                                                                            |
