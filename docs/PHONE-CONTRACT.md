# Phone app contract

How a lifekit web app behaves on a phone, as one page. The shell (`cmn-app-layout` and its parts)
guarantees the chrome and the behaviour around it; a page only declares what is its own. This is
the mobile chapter of the [UX continuity policy](STRATEGY.md#ux-continuity-policy): where the policy
already rules (loading, empty, error, page frame), the policy wins and this page adapts it. The
browser-level chrome (tab title, icons, `theme-color`, manifest) is the
[browser chrome standard](BROWSER-CHROME.md). The UI/UX policy as a whole, with the source each
rule comes from and the check that enforces it, is [design/guardrails.md](design/guardrails.md).

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

| Area           | Guarantee                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tab bar        | Navigation only, 3-5 destinations, one-word labels that never truncate, always visible except under a sheet. It is the iOS tab bar: edge to edge on the bottom edge, 49pt of items and only `env(safe-area-inset-bottom)` below them, no margin, translucent over the content. The last tab, More, opens a page the app builds, never a sheet. Badges for critical info only.                                                                    |
| Tab state      | Each tab remembers its last screen. Launch restores the last tab. Re-tapping the active tab scrolls to top, then pops to the tab root.                                                                                                                                                                                                                                                                                                           |
| Top bar        | Owns the title, the back chevron (no "Back" text) and a trailing actions slot. A 44pt bar below `md` (the safe area on top of that). While the page's large title is showing and the page is at the top, the bar is transparent with no hairline (the iOS scroll-edge appearance), so it never reads as an empty band; any scroll gives it its material back, and the large title shrinks into it. No page renders its own back button or title. |
| Back           | Back goes to the route's `parent`, or to history when there is none. A deep link to a detail still has a way up. The system swipe back works and is never overridden.                                                                                                                                                                                                                                                                            |
| Scroll         | The shell owns the scroller. Back restores the scroll position. Overscroll does not chain to the browser (`overscroll-behavior-y: contain`).                                                                                                                                                                                                                                                                                                     |
| Sheets         | `cmn-drawer` (half and full stops, grabber, drag to dismiss) and `cmn-dialog` (below `md`, see "Dialogs on a phone") share one drag controller. Do not open two at once.                                                                                                                                                                                                                                                                         |
| Content insets | The shell measures its pinned chrome and publishes it as insets, so content never sits under the top bar, and the last row of a page scrolls clear of the tab bar and the floating action. See "Content clears the chrome".                                                                                                                                                                                                                      |
| Overlays       | Install hint, offline banner and update prompt sit in the content area, below the top bar. They never cover the top bar or the tab bar. The floating action hides while a sheet is open.                                                                                                                                                                                                                                                         |
| Touch          | 44pt hit areas for every chrome control, and on a phone for every `cmn-*` and `lk-*` control in the content too. Chrome text is not selectable. Keyboard hints are hidden on touch (`(hover: none)`).                                                                                                                                                                                                                                            |
| Safe areas     | Top bar, tab bar and sheets pad `env(safe-area-inset-*)`.                                                                                                                                                                                                                                                                                                                                                                                        |
| Zoom           | Nothing zooms by accident: the document viewport is `width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover` (never `user-scalable=no`, so a deliberate pinch still works), the shell sets `touch-action: manipulation`, and fields are 16px.                                                                                                                                                                                  |
| Layout by size | Under 600px: tab bar. 600-839px: collapsed sidebar as a rail. 840px and up: sidebar. A landscape phone (short, coarse pointer) keeps the tab bar.                                                                                                                                                                                                                                                                                                |
| Appearance     | Follows the system light or dark setting by default. The override lives in Settings. `theme-color` matches the surface, per the browser chrome standard.                                                                                                                                                                                                                                                                                         |
| Motion         | Brief and purposeful. Everything fades or stops under Reduce Motion.                                                                                                                                                                                                                                                                                                                                                                             |

The top bar's theme toggle is off by default (`showThemeToggle`), because it can only flip between
light and dark and never back to System. The override lives in Settings (`cmn-appearance-settings`)
and in the command palette ("Appearance: System / Light / Dark"). Where an app turns the toggle on,
below 360px a page with two or more actions loses it so the title stays readable.

Below 360px, a page with more than two actions keeps only its first action inline and moves the
rest into a "More actions" menu (Angular CDK menu: arrow keys, Escape, focus returns to the
trigger). Each item keeps its action id, `route` and `disabled`. With back, search and avatar the
title keeps at least 64px at 320px and 359px. From 360px every action stays inline and the theme
toggle, where an app has turned it on, stays visible; with three actions the title there is about 28px.

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

#### The account on a phone

On a phone the account surface is the More page, not an avatar in the top bar. `cmn-app-layout`
takes `accountOnPhone`: `more` (the default whenever `moreRoute` is set) drops the top bar's avatar
in the phone shell, and `avatar` keeps it. `more` with no `moreRoute`, or with no `account` (an app
still on the deprecated `avatarLabel` / `avatarMenuItems`, which `cmn-more-page` does not read),
keeps the avatar too, so the account never becomes unreachable. Wider windows always show the avatar
and its menu.

```html
<cmn-app-layout [navItems]="navItems" [tabRoutes]="tabRoutes" moreRoute="/more" [account]="account">
  <router-outlet />
</cmn-app-layout>
```

```ts
protected readonly account: AppLayoutAccount = {
  label: user.name, name: user.name, email: user.email, pictureUrl: user.picture,
  menuItems: accountMenu({settingsRoute: '/settings', extras: [{id: 'whatsNew', label: "What's new", icon: 'Sparkles'}]}),
};
```

- **One menu everywhere.** `accountMenu()` returns Settings, then the app's extras, then Sign out
  (label "Sign out", separated by a divider), with the same ids, icons and order in every app. The
  Settings item's id is its route, so the layout and `cmn-more-page` navigate there themselves;
  the app handles `avatarMenuSelect` (or `cmn-more-page`'s `itemSelect`) for `ACCOUNT_SIGN_OUT_ID`
  and its extras only.
- **Identity.** `AppLayoutAccount` takes `name`, `email` and `pictureUrl`; a name or an email puts
  an identity header, as text and not an item, at the top of the menu and on the More page. An
  account that passes only `label` and `menuItems` keeps the menu it had.
- **`cmn-more-page`** is the page to declare for `moreRoute`: the overflow nav (`items`, with
  `tabRoutes`), an account card with the identity, Settings and the extras, Sign out in a card of
  its own, and `versionLabel`. It owns no sign-in.

### Content clears the chrome

In the phone shell the top bar and the tab bar sit over `<main>`, the scroller, so content can
scroll under their translucent surfaces. The shell measures what is pinned over each end with a
ResizeObserver and publishes it on `<main>` (`CMN_CONTENT_INSET_PROPERTIES`), so nothing depends
on a fixed bar height, safe-area insets included:

| Custom property              | Value                                                                                                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--cmn-content-inset-top`    | The top bar's height, safe area included. `<main>`'s top padding.                                                                                                                                             |
| `--cmn-content-inset-bottom` | What covers main's bottom: the tab bar plus any declared `floatingActionClearance`, or up to the floating action's top when that sits higher, plus 8px of breathing room. Where the page's end padding stops. |
| `--cmn-sticky-top`           | The height of the notices pinned under the top bar (offline, install, update), 0px when there are none. Where a sticky header sticks.                                                                         |

Outside the phone shell all three are unset, and everything that reads them falls back to 0px.

- **Top.** `<main>` pads its top by `--cmn-content-inset-top`, and its `scroll-padding-top` adds
  the notices, so focusing or scrolling to an element never leaves it under the chrome.
- **Bottom.** The shell owns the clearance, whatever the page is built from. `<main>` pads its end
  by `--cmn-content-inset-bottom` (and `scroll-padding-bottom` reads the same inset), and projects
  the page into a frame that fills main's content box below the large title and the notices,
  followed by a spacer the shell sizes to the frame's overflow. So the last row clears the tab bar after bare content following a page
  container, after two sibling top-level page containers (no gap opens between them), and after an
  `h-full` host whose content overflows it. A page container adds no end inset of its own.
- **Page height.** A page is never capped at the screen's height on a phone. `fill` makes the page
  container at least the screen tall (`min-h-full`); the cap (`h-full`) applies from `md` only, where
  a fill page scrolls a child internally. `h-full` resolves to that frame's height, so a short page under a large
  title and notices leaves main nothing to scroll, and a chat-style
  host (`relative flex h-full` with an internal scroller) fills exactly the visible area and main
  does not scroll. The spacer is re-measured when the page's children, their sizes or the chrome
  change; content that only grows through images or CSS-only changes is not observed. A `sticky`
  element that is a direct child of the page frame releases once the frame ends, so keep sticky
  headers inside a page container or section.
- **Sticky headers.** A sticky offset inside `<main>` counts from its padding edge, which is
  already below the top bar. So a sticky header uses `top: var(--cmn-sticky-top, 0px)`, never
  `--cmn-content-inset-top`: that would count the top bar twice and leave a gap of its height.
  `cmn-list-section` does this for you.

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
| Long lists  | A filtered or grouped list is built from the shared parts below, not hand-rolled rows and headers.                                                      |

### Long lists

The parts of a long list page (transactions, alerts, events) are shared, so every app filters,
groups and scrolls a list the same way.

```html
<cmn-page-container fill>
  <cmn-filter-bar
    [(query)]="query"
    [activeCount]="activeFilters()"
    [applied]="appliedChips()"
    (remove)="dropFilter($event)"
    (clear)="clearFilters()"
    placeholder="Search transactions"
    sheetTitle="Transaction filters"
  >
    <lk-chip-row label="Period" cmnFilterBarQuick></lk-chip-row>
    <ng-template let-close="close" cmnFilterBarSheet>
      <!-- the filter form; a Done button calls close() -->
    </ng-template>
  </cmn-filter-bar>

  @for (day of days(); track day.date) {
  <cmn-list-section [heading]="day.label">
    <span cmnListSectionAside>{{ day.total }}</span>
    @for (row of day.rows; track row.id) {
    <cmn-list-item-row ... />
    }
  </cmn-list-section>
  }
</cmn-page-container>
```

| Part                             | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cmn-filter-bar`                 | The filter flow: a search field (`[(query)]`), a Filters button badged with `activeCount`, a `cmnFilterBarQuick` slot for a quick-filter row, and the `applied` filters as removable chips with Clear (`remove`, `clear`). A `cmnFilterBarSheet` template opens from the Filters button as a bottom sheet on a phone and a side drawer from `md`. The bar keeps no filter state.                                                                                                     |
| `lk-chip-row`                    | Quick filters on one line: a period, a status, an account. Scrolls sideways with an edge fade and snap, never truncates a label, keeps the selected chip in view, shows counts as badges, single or multi select, 44px chips.                                                                                                                                                                                                                                                        |
| `cmn-segmented` / `lk-segmented` | A short parameter choice (a view mode, a chart period): five segments or fewer, short noun labels. Cells are equal and as wide as the widest label, and never narrower than their own: a row that needs more than its container scrolls inside itself (chosen cell kept in view, page never widens) rather than truncate. `lk-segmented` warns in development when it overflows. More choices, or long labels, use `lk-chip-row`; a rarely changed setting such as sort uses a menu. |
| `cmn-list-section`               | One group of rows under a heading: a day of transactions, a severity of alerts. The heading is an `h2` that names the section, with a `cmnListSectionAside` slot for a total or count; the rows sit in an unpadded `cmn-card` (`card` false leaves them bare). On a phone the heading sticks flush under the top bar while its rows scroll past, and the next heading pushes it out.                                                                                                 |

#### Paging a long list

A list longer than one page of rows ends in `lk-infinite-list`, not a Load More button or a pager.
It wraps the rows, owns no data, and a store drives it through the paging contract:

| Store signal        | List binding / event           | Meaning                                                                     |
| ------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| has another page    | `[hasMore]`                    | There is a cursor, or the last page was full.                               |
| append in flight    | `[loading]`                    | Skeleton rows show and no further page is asked for.                        |
| append failed       | `[failed]`                     | An inline "Couldn't load more" with Try again shows; the list stops asking. |
| fetch next page     | `(lk-infinite-list-load-more)` | The end is within reach and nothing is in flight, failed or finished.       |
| fetch the same page | `(lk-infinite-list-retry)`     | The reader pressed Try again; the store clears `failed` and fetches.        |

```html
<lk-infinite-list
  [hasMore]="store.hasMore()"
  [loading]="store.isAppending()"
  [failed]="store.appendFailed()"
  (lk-infinite-list-load-more)="store.loadNextPage()"
  (lk-infinite-list-retry)="store.loadNextPage()"
>
  @for (day of days(); track day.date) {
  <cmn-list-section [heading]="day.label">...</cmn-list-section>
  }
</lk-infinite-list>
```

The first page is not the list's job: `cmn-async-state` draws the first load (a `list` skeleton) and
the list appears once rows exist. Appending sets `loading` and keeps the rows on screen: the store appends the page, it does not replace the list. A short page that leaves the end in
reach asks again until the screen is full.

### Sheet or page

| Use a sheet when                                          | Use a page when                                         |
| --------------------------------------------------------- | ------------------------------------------------------- |
| The user peeks at one record and returns to the same list | The record has its own sections, actions or a deep link |
| The task is short, one decision or a few fields           | The task needs the keyboard and scrolling for a while   |
| Nothing in it needs to be linked to or restored           | The user may arrive from a notification or a shared URL |

Sheets that hold input ask for confirmation before a swipe dismisses unsaved changes. An alert has
at most three buttons. A destination in the tab bar is a page, never a sheet.

### Dialogs on a phone

Below `md` a `cmn-dialog` is never a centred card (Apple HIG). The caller picks the presentation
with `phone` on `CmnDialogService.open()`; from `md` up the option is ignored and the dialog is the
centred card it always was.

| `phone`             | HIG name     | Use it for                                | Behaviour                                                                                                                                                                              |
| ------------------- | ------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'sheet'` (default) | Sheet        | A form or a quick look                    | Anchored to the bottom, grabber, swipe down or tap the backdrop to dismiss, never taller than the screen minus the status bar, content scrolls above the keyboard, pads the safe area. |
| `'full-screen'`     | Full screen  | A long multi-step flow (the stepper)      | Fills the screen, clear of the status bar and home indicator. No swipe: it is left by its close button or its own Cancel and Finish. The default for `size: 'full'`.                   |
| `'action-sheet'`    | Action sheet | A short list of actions or a confirmation | Floating card inset from the edge with the choices, and a separate Cancel card below it (`cancelLabel`, hidden under `disableClose`). `confirm()` uses it.                             |

`phone: 'dialog'` pins the centred card on a phone too, for a case that cannot be a sheet.

`disableClose` removes the swipe, the backdrop tap, Escape and the close affordances in every
mode. The sheet slides in and out unless the user prefers reduced motion. A `cmn-dialog-actions`
bar pins to the bottom of a sheet or full-screen body; in an action sheet its buttons stack.

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

Calm loading is the default (guardrails S3, S4): `keepContent` is on, `showDelay` is 200ms and
`minDisplay` is 400ms. A region that needs the old behaviour sets `[keepContent]="false"` or a
delay of `0`.

| Input           | Does                                                                                                                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keepContent`   | On by default. A refresh keeps the loaded content on screen, dimmed, instead of swapping it for the skeleton. A first load (nothing to keep) still shows the skeleton. The dim follows `showDelay`. |
| `showDelay`     | Milliseconds a load must last before any loading indicator shows; 200 by default (`ASYNC_STATE_SHOW_DELAY_MS`). Until then the content already on screen stays put, so a fast load shows no flash.  |
| `minDisplay`    | Milliseconds an indicator that has shown stays up, so it never flashes away; 400 by default (`ASYNC_STATE_MIN_DISPLAY_MS`). Not applied to a kept (dimmed) body: fresh content replaces it at once. |
| `crossfade`     | The content fades in (`--cmn-duration-short`) when it replaces the skeleton; content already there at first render paints at once; nothing under Reduce Motion.                                     |
| `skeletonShape` | Draws the placeholder as a `cmn-skeleton` preset (`skeletonRows` rows) instead of the default bars; a projected `[skeleton]` still wins.                                                            |

A skeleton goes on a container, never inside the text it stands for. `cmn-skeleton` draws a bar by
default; `shape` draws a component's whole silhouette from that component's own geometry, so the
page does not move when the content arrives:

| `shape`   | Stands in for                                  | Notes                                                                                                                    |
| --------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `row`     | `cmn-list-item-row` (avatar, two lines, value) | `count` rows (default 1), divided like the real rows. Put them in the same `cmn-card` the real rows use.                 |
| `section` | `cmn-list-section`                             | The sticky-heading height, then a card of `count` rows (default 3).                                                      |
| `stat`    | `cmn-stat-card`                                | Label, value and delta.                                                                                                  |
| `chart`   | `cmn-line-chart` card                          | The plot keeps the chart's own height (`h-48`); `aspect` (`16 / 9`) reserves a ratio instead for a chart sized by ratio. |

The sweep is one `--color-skeleton-sheen` band moving by `transform` over `--color-skeleton`, a
token held apart from `surface-raised` so a skeleton reads as a placeholder in light and dark. It
stops under Reduce Motion and leaves the still block. Presets are `aria-hidden`; the region's
`role="status"` "Loading" carries the announcement. The suite holds each preset to within 8px of
the loaded component at 375, 390 and 402 (`Conformance/Skeleton Geometry`).

| State   | Shows                                                                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Loading | A skeleton shaped like the content, the old content while refreshing.                                                                                  |
| Empty   | Only after a successful load with no results. Explains the section and offers action.                                                                  |
| Error   | In place of the skeleton on a first load, a banner over the last good data otherwise. Always with Retry. Never shown as empty.                         |
| Offline | What still works, plus the time of the last sync. Never blocks content, never covers the chrome. A banner over content, or a panel when there is none. |

## Forms and notifications

- Keyboard matches content. Validation follows GOV.UK: errors show when the form is submitted,
  never on blur or while typing; a shown error clears as soon as the field is fixed; and an error
  says what went wrong and how to fix it (guardrails V1 to V4). `cmn-form-field` does the timing.
- Push (when it ships) asks for permission after an in-context explainer, has an in-app settings
  page, shows an app-icon badge for unread alerts, and keeps amounts out of the notification text.
- Sign-in is never asked for again while a session is valid. Passkeys are supported when the
  identity provider offers them.

## Accessibility and performance floor

- Targets 44x44pt (28 at the very minimum); text on the Instrument ramp (14px body, a 12px floor
  the suite checks, 16px in inputs per rule 9); 200% text size supported (WCAG 1.4.4); contrast
  4.5:1.
- A cold first load stays within Core Web Vitals "good": LCP at most 2.5 s, INP at most 200 ms,
  CLS at most 0.1.
- Haptics are not possible in an iOS PWA and are not part of the contract.

## The phone standard

The rules every lifekit app keeps on a phone, with the sources behind them and the suite check
that holds each one. A rule marked "follow-up" is the target; its parts and check come later.

1. **Content clears fixed controls.** The shell measures its pinned chrome and publishes the
   insets (above). `<main>` pads its end by the bottom inset and the shell sizes a spacer after
   the page frame, `scroll-padding` reads the same values, and a page host is never capped at the screen's height on a phone. Sources: WCAG
   2.2 SC 2.4.11 and technique C43, failure F110; MDN `scroll-padding` and `env()`; WebKit
   "Designing Websites for iPhone X"; HIG Layout (safe areas). Check: the last content of a list
   page clears the tab bar and the floating action at 375, 390 and 402.
2. **Overlays sit in flow.** Install, offline and update notices render in the notice slot below
   the top bar; a toast sits above the bottom inset. Nothing covers the chrome. Check: notices sit
   below the top bar and above the tab bar.
3. **Touch targets.** Every interactive element on a phone has a hit area of at least 44x44 CSS
   px. A smaller visual (a 32px chip, a `sm` button) keeps its look and gets a 44px hit area
   (`PHONE_HIT_AREA_CLASSES`, `.cmn-hit-slop`). Inline text links follow WCAG 2.5.8. Sources: HIG
   Buttons and Accessibility (44pt, 28pt minimum); WCAG 2.5.8 and 2.5.5; M3 48dp. Check: targets
   are at least 44 in the phone chrome and on the list page.
4. **Overflow rows.** A control row never overlaps or clips a label. Segmented controls keep to
   five segments or fewer with equal cells at least as wide as the widest label. A filter with
   counts, more than five options or two dimensions uses `lk-chip-row`; a rarely changed setting
   (sort) uses a menu. Sources: HIG Segmented controls; M3 Segmented buttons and Filter chips; WCAG
   1.4.10, 1.4.12, 1.4.4. Check: no segmented cell or chip label overflows at 375, 390 and 402, and an over-long segmented row never scrolls the page sideways.
5. **Skeletons and states.** Every async region uses `cmn-async-state` with a skeleton shaped like
   the rendered content (the `cmn-skeleton` `shape` presets), on containers only, with no
   indicator for loads under 200ms (`showDelay`, on by default) and a 400ms minimum display time
   once shown (`minDisplay`, on by default). The sweep stops under Reduce Motion. Sources: NN/g "Skeleton Screens 101"; M3
   Progress indicators; Atlassian and Carbon loading; web.dev CLS. Check: each preset's box is
   within 8px of the loaded component's; the state pattern. To come: CLS at most 0.1 per route.
6. **Continuity.** Data on screen stays while it refreshes (`keepContent`, on by default); a tab return paints at
   once and revalidates; scroll restore waits for the data; tab destinations preload on idle, after
   first paint, except under Save-Data or on a metered connection (`TabPreloadStrategy`, `projects/core/README.md`),
   and a tab switch is a View Transition (`withLkViewTransitions()`, `DESIGN.md` Motion). Sources:
   RFC 5861; angular.dev service worker `dataGroups`, route preloading, `@defer`, View Transitions;
   HIG Loading. Check today: back restores scroll.
7. **Motion.** Durations and easings come from tokens (`--cmn-duration-short|medium|long`: 150,
   250 and 400ms; `--cmn-ease-standard|emphasized-decelerate|emphasized-accelerate`, the M3
   curves, with Tailwind `duration-cmn-*` and `ease-cmn-*`); only transform and opacity animate;
   under Reduce Motion, movement becomes a fade or nothing (the global block in `theme.css`; a
   spinner is the one thing that keeps turning). Sources: HIG Motion; M3 easing and duration
   tokens; WCAG 2.3.3. Check: no transform animation runs under Reduce Motion, on the skeleton
   and on a sheet.
8. **Lists and pagination.** Phone lists load continuously: an `lk-infinite-list` asks for the
   next page when its end comes within about one screen, shows skeleton rows while the page
   appends, an end marker once there is no more, and an inline retry when a page fails (a
   full-width 44px Load More where `IntersectionObserver` is missing). No page size selectors or
   Prev/Next pagers on a phone. Sources: NN/g "Infinite Scrolling Is Not for Every Website" and
   "Infinite Scrolling: When to Use It". Check: scrolling an `lk-infinite-list` to its end reaches
   the end marker with every page loaded and the last row clear of the tab bar, at 375, 390 and 402.
   - **8a. Sticky section headers.** A grouped long list (transactions by day, alerts by day or
     severity, events) pins the current group's header under the top bar while its rows scroll,
     and the next header pushes it out, as an iOS plain list does. Use `cmn-list-section`. The
     header sticks at `--cmn-sticky-top` with an opaque surface fill, flush under the top bar and
     any pinned notices. Source: UIKit `UITableView.Style.plain`. Check: the header pins flush
     under the top bar, never overlapping it, at 375, 390 and 402.
9. **Text input.** Inputs, selects and textareas are 16px below `md` (iOS zooms into a focused
   field set smaller) and at least 44px tall, and carry `inputmode`, `enterkeyhint` and
   `autocomplete`. Sheets size with `dvh` and keep the focused field in the visual viewport
   (follow-up). Sources: WebKit `WKWebViewIOS.mm`; MDN `inputmode`, `enterkeyhint`.
10. **Phone sizes.** The shell holds at 320, 360, 375, 390, 393, 412 and 430 wide, at 667 and 932
    tall: nothing scrolls sideways, page content keeps the 16px side gutters, the tab bar ends on
    the screen's bottom edge at 49pt (plus the inset) with every label whole, targets are at least
    44pt, and fields are 16px with `touch-action: manipulation` on the shell. Check: the sweep
    suite (`phone-sweep.spec.ts`), plus the top bar's scroll edge.
11. **Navigation.** The tab bar stays visible with five destinations or fewer and one-word labels,
    badges only for critical information; root pages have a large title that collapses on scroll.
    Sources: HIG Tab bars and Toolbars; M3 Navigation bar. Check: tab labels, shell by device.

Touch-sized controls in the landscape phone's and the tablet's chrome (the top bar's account menu
and search, the rail's buttons) are not promised yet: those layouts keep desktop density. The suite
reports them without failing (advisory) until a follow-up decides them.

## Status

The contract is the target. The shell reaches it step by step, and each step adds a check to the
phone conformance suite (`npm run test:phone`). CI runs it with `PHONE_CONFORMANCE=gate`, so every
check fails the build except the advisory ones; a guarantee above is only gating once its check
exists.

| Guarantee                               | Status                                                                                                                                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tab bar, sheets, safe areas             | Built: `cmn-drawer` sheets and phone `cmn-dialog` presentations, More is a page; the dialog stories carry VRT and behaviour specs                                                   |
| Account on a phone                      | Built: `accountOnPhone`, `accountMenu()`, `cmn-more-page`; no suite check yet                                                                                                       |
| Top bar title, back, actions            | Built: route data `title`, `parent`, `actions`; the suite checks the title at 320                                                                                                   |
| Shell-owned scroll and tab state        | Built: checked by the suite's "back restores scroll"; see "Scroll and tab state"                                                                                                    |
| One state pattern                       | Built: `cmn-async-state`; the suite checks the offline and error states at 320 and 390                                                                                              |
| Touch size (44pt chrome, labels, hints) | Built: `--size-touch`, `.cmn-hit-slop`, `PHONE_HIT_AREA_CLASSES`; the suite enforces 44x44 at 390x844 and on the list page, labels at 320, hints; landscape and tablet are advisory |
| Layout by size                          | Built: `CmnShellService` picks tab bar, rail or sidebar; the suite checks each width and device                                                                                     |
| Appearance                              | Built: `cmn-appearance-settings` in Settings, palette entries, synced through `AppearanceService`                                                                                   |
| Overlays                                | Built: the notice slot; the suite checks notices sit between the top bar and the tab bar                                                                                            |
| Content insets                          | Built: measured `--cmn-content-inset-*`; the suite checks the last content clears the tab bar, whatever the page composition                                                        |
| Long lists (filter, chips, sections)    | Built: `cmn-filter-bar`, `lk-chip-row`, `cmn-list-section`; the suite checks labels and headers                                                                                     |
| Phone sizes and zoom                    | Built: edge-to-edge 49pt tab bar, 44pt scroll-edge top bar, viewport standard, `touch-action`; the suite sweeps seven widths at two heights                                         |
| Text input (16px, 44px)                 | Built: every `cmn-*` field below md; `dvh` sheets and visual viewport are a follow-up                                                                                               |
| Skeletons and motion                    | Built: `cmn-skeleton` presets, `cmn-async-state` calm loading, motion tokens; the suite checks preset geometry and Reduce Motion                                                    |
| Continuity and paging                   | Built: `lk-infinite-list`, `TabPreloadStrategy` (idle tab preload, skipped under Save-Data or metered), `keepContent`; the suite checks the end of a continuous list                |
