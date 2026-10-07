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

| Area           | Guarantee                                                                                                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tab bar        | Navigation only, 3-5 destinations, one-word labels that never truncate, always visible except under a sheet. No "More" overflow: that destination is a page. Badges for critical info only. |
| Tab state      | Each tab remembers its last screen. Launch restores the last tab. Re-tapping the active tab scrolls to top, then pops to the tab root.                                                      |
| Top bar        | Owns the title, the back chevron (no "Back" text) and a trailing actions slot. The page's large title shrinks into the bar on scroll. No page renders its own back button or title.         |
| Back           | Back goes to the route's `parent`, or to history when there is none. A deep link to a detail still has a way up. The system swipe back works and is never overridden.                       |
| Scroll         | The shell owns the scroller. Back restores the scroll position. Overscroll does not chain to the browser (`overscroll-behavior-y: contain`).                                                |
| Sheets         | One sheet implementation, `cmn-drawer`: half and full stops, a grabber, drag to dismiss, at most one open at a time, opens at most half height.                                             |
| Overlays       | Install hint, offline banner and update prompt sit in the content area, below the top bar. They never cover the top bar or the tab bar. The floating action hides while a sheet is open.    |
| Touch          | 44pt hit areas for every chrome control. Chrome text is not selectable. Keyboard hints are hidden on touch (`(hover: none)`).                                                               |
| Safe areas     | Top bar, tab bar and sheets pad `env(safe-area-inset-*)`.                                                                                                                                   |
| Layout by size | Under 600px: tab bar. 600-839px: collapsed sidebar as a rail. 840px and up: sidebar. A landscape phone (short, coarse pointer) keeps the tab bar.                                           |
| Appearance     | Follows the system light or dark setting by default. The override lives in Settings. `theme-color` matches the surface, per the browser chrome standard.                                    |
| Motion         | Brief and purposeful. Everything fades or stops under Reduce Motion.                                                                                                                        |

## What a page declares

Pages declare these in route data and templates. No per-page header, back or sheet code.

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

One component covers every state, built on the policy's rules (skeletons, loading is not empty,
keep cached data, errors keep context):

| State   | Shows                                                                                                                          |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Loading | A skeleton shaped like the content, the old content while refreshing.                                                          |
| Empty   | Only after a successful load with no results. Explains the section and offers action.                                          |
| Error   | In place of the skeleton on a first load, a banner over the last good data otherwise. Always with Retry. Never shown as empty. |
| Offline | What still works, plus the time of the last sync. Never blocks content, never covers the chrome.                               |

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
phone conformance suite, so a guarantee above is only gating once its check exists.

| Guarantee                                        | Status                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Tab bar, sheets, safe areas                      | Partial: tab bar and `cmn-drawer` exist, with two sheet implementations and no stops |
| Top bar title, back, actions                     | Target                                                                               |
| Shell-owned scroll and tab state                 | Target                                                                               |
| One state pattern                                | Target (policy rules 1, 2 enforced by `cmn-async-state`)                             |
| Touch size, overlays, layout by size, appearance | Target                                                                               |
