# What's new

One component and one convention, so every lifekit app tells people what changed the same way: a
notes file per app, a dot on the account menu and the More page until the running version has been
opened, a sheet that lists the releases, and a seen marker kept on the device. It was
finance-sentry's own code; it now lives in `@lifekit-hq/ui` (`cmn-whats-new`) and
`@lifekit-hq/tokens` (`lifekit-whats-new`), and every app adopts the same pieces.

## The notes file

`src/whats-new/notes.md` in the app. One `## x.y.z` heading per release, newest first, with three to
six one-line bullets under it. Write them for the person using the app: second person, what they
can now do or no longer run into, no library or module names, no issue numbers.

```md
<!-- Plain notes for the "What's new" sheet, read by lifekit-whats-new. -->

## 1.14.0

- Transactions are grouped by day, and you can show only money in or only money out.
- A bank connection that has expired is now marked as expired.
- You can invite people from the People page in Settings. (owner)
```

- `(owner)` at either end of a bullet marks a line only the owner should read. The app decides who
  that is (`includeOwnerNotes`, below); without it every owner line is left out.
- Anything that is not a `## x.y.z` heading or a `- ` bullet (the comment, prose) is ignored. Any
  other `##` heading (`## Unreleased`, `## 1.3.0 - beta`) closes the release above it, so the bullets
  under it are left out rather than added to the wrong version.
- A release with no notes shows its change list instead, and raises no dot: a badge means there is
  something to read.
- Only the newest six releases are listed.

## Building `whats-new.json`

`lifekit-whats-new` (a bin of `@lifekit-hq/tokens`) turns the notes file into the JSON the sheet
fetches. Run it before `start` and `build`:

```json
{
  "scripts": {
    "prestart": "lifekit-whats-new",
    "prebuild": "lifekit-whats-new --changelog ../CHANGELOG.md",
    "lint:whats-new": "lifekit-whats-new --check"
  }
}
```

| Flag                      | Meaning                                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `--notes <file>`          | The notes file. Default `src/whats-new/notes.md`; a missing file is an app that has written none yet.                                     |
| `--out <file>`            | Where the JSON goes, served from the app's root. Default `public/whats-new.json`.                                                         |
| `--changelog <file>`      | A release-please `CHANGELOG.md`. Each release in it becomes an entry with its date, its notes and a folded list of every user-facing fix. |
| `--internal-scope <name>` | A changelog scope to drop from that list (repeatable), on top of the built-in plumbing scopes (`ci`, `deps`, `api`, …).                   |
| `--check`                 | Write nothing; exit 1 when the file on disk is not what the sources produce.                                                              |

Without `--changelog` the releases are the notes file's own headings, in file order, with no date
and no change list. The shape is `WhatsNewData` (`@lifekit-hq/ui`, and `@lifekit-hq/tokens/whats-new`
for tooling).

## Wiring it into an app

Give the app its running version once, in its providers:

```ts
import {provideWhatsNew} from '@lifekit-hq/ui';

provideWhatsNew({
  version: APP_VERSION, // 'x.y.z'
  storageKey: 'myapp.whatsNew.lastSeen', // one per app
  includeOwnerNotes: () => auth.isOwner(), // optional; closes over the app's own role signal
  // url: '/whats-new.json', // optional; where lifekit-whats-new wrote the file
});
```

Then put the item in the account menu and handle it where the app handles its other extras:

```ts
protected readonly whatsNew = inject(CmnWhatsNewService);

protected readonly account = computed<AppLayoutAccount>(() => ({
  label: user.name,
  menuItems: accountMenu({
    settingsRoute: '/settings',
    extras: [whatsNewMenuItem(this.whatsNew.hasUnread())],
  }),
}));

protected onAccountItem(item: MenuItem): void {
  if (item.id === WHATS_NEW_MENU_ID) {
    this.whatsNew.open();
  }
}
```

The dot shows itself everywhere the item does: the menu row, the avatar that opens the menu, the
More page row and the More tab (which is the only door to the account on a phone). On the
sidebar's version footer, bind `[versionLabel]="whatsNew.versionLabel"`,
`[versionDot]="whatsNew.hasUnread()"` and `(versionClick)="whatsNew.open()"`. The command palette
and Settings' About section call `whatsNew.open()` the same way; About can also draw the list
inline with `<cmn-whats-new [versions]="whatsNew.versions()" [status]="whatsNew.status()" />`.

## How it behaves

- **The sheet** is the drawer: a side panel from md (768px) up and a bottom sheet below it, with the
  drawer's own grabber, stops and Reduce Motion handling. It lists the releases newest first; each
  has its date, its plain lines and, folded under them, every change in that release.
- **The seen marker** is the version, in `localStorage` under `storageKey`. The first run on a
  device counts as seen, so nobody is greeted with a dot on first sign-in. A marker older than the
  running version raises the dot once the notes are fetched and the running release has a line the
  person may read. `open()` records the running version, so the dot clears the moment the sheet
  opens. A blocked store is "nothing seen yet" and a failed write is a dot that can come back; nothing else depends on it.
- **The fetch** is `GET <url>?v=<version>`: the version in the query keeps a browser-cached copy from
  an older release out of the sheet. It happens when the sheet opens, or earlier on a device whose
  marker is behind (the dot needs to know whether the release has notes). A failure shows the error
  state with Retry; the dot stays off.

## What the library holds

| Piece                                           | What                                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `cmn-whats-new`                                 | The release list: inputs `versions`, `status`; output `retry`.                                   |
| `CmnWhatsNewService`                            | `hasUnread`, `versions`, `status`, `versionLabel`, `load()`, `markSeen()`, `open()`.             |
| `provideWhatsNew(config)`                       | The running version, the file's url, the storage key, the owner rule.                            |
| `whatsNewMenuItem(unread)`, `WHATS_NEW_MENU_ID` | The account-menu item with its dot.                                                              |
| `MenuItem.dot`                                  | A dot on any menu or More-page item; `cmn-app-layout` mirrors it on the More tab and the avatar. |
| `lifekit-whats-new`                             | Builds `whats-new.json` from the notes file and the changelog.                                   |

Golden stories: `Templates/Whats new` (Settings' About section with the dot, and the sheet open),
at 390 and 1280, light and dark; `Components/WhatsNew` for the list's states and the sheet
launcher. Screen baselines: `projects/ui/e2e/screens/whats-new.spec.ts`.
