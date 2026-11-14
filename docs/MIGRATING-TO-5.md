# Migrating to 5.0

5.0 makes the page template mandatory and takes Tailwind's default spacing and type scales out of the
preset. All six `@lifekit-hq/*` packages move together; bump them in one commit.

Every app already roots its routed pages on `cmn-page` (the precondition for this release), so the
migration is mostly a mechanical rename of utility classes.

## What breaks

| Change                                                       | What happens in an app                                                                             |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Spacing is **replaced** in the Tailwind preset, not extended | `p-4`, `gap-2`, `-mt-1`, `space-y-6`, `top-3` and the rest generate **nothing**, without a warning |
| Type sizes are **replaced** in the Tailwind preset           | `text-xs`, `text-sm`, `text-base`, `text-lg` ... `text-9xl` generate nothing                       |
| `text-cmn-xl` is removed                                     | It was an alias of `text-cmn-lg`; use that                                                         |
| `cmn-page-container` / `PageContainerComponent` is removed   | The tag renders as an unknown element; use `cmn-page`                                              |
| `lifekit/page-root` is an **error** in `@lifekit-hq/config`  | A routed page that is not rooted on `cmn-page`, or that sets its own spacing, fails `ng lint`      |
| `theme.extend.spacing` and `theme.extend.fontSize` moved     | The preset now sets `theme.spacing` and `theme.fontSize`; code that read the `extend` keys breaks  |

Tailwind drops a class it does not know, so a leftover `p-4` is a silent layout bug, not a build
error. `check:drift` finds them (below).

## Steps

1. **Bump** every `@lifekit-hq/*` dependency to `^5.0.0` and reinstall.
2. **Find what is left** with the drift check, which now reports the default-scale classes:

   ```bash
   npx lifekit-chrome-check drift src
   ```

   Findings read `p-4 is Tailwind's default spacing ... use p-cmn-4` (rule `spacing`) and
   `text-sm is Tailwind's default type size ... use a text-cmn-* step` (rule `text-size`). Specs and
   stories are not scanned; grep them too.

3. **Rename spacing utilities.** The `cmn-N` step has the same value as Tailwind's step `N` for
   every step the scale keeps, so the rename changes no pixels:

   | Tailwind | 0.5             | 1             | 2             | 3              | 4              | 5              | 6              | 7              | 8              | 10              | 12              | 16              |
   | -------- | --------------- | ------------- | ------------- | -------------- | -------------- | -------------- | -------------- | -------------- | -------------- | --------------- | --------------- | --------------- |
   | cmn step | `cmn-0.5` (2px) | `cmn-1` (4px) | `cmn-2` (8px) | `cmn-3` (12px) | `cmn-4` (16px) | `cmn-5` (20px) | `cmn-6` (24px) | `cmn-7` (28px) | `cmn-8` (32px) | `cmn-10` (40px) | `cmn-12` (48px) | `cmn-16` (64px) |

   `p-4` becomes `p-cmn-4`, `-mt-1` becomes `-mt-cmn-1`, `md:gap-2` becomes `md:gap-cmn-2`, and
   `[class.mt-1]` becomes `[class.mt-cmn-1]`. `0` and `px` are kept (`p-0`, `top-px`).

   Steps with no `cmn-*` equivalent (1.5, 2.5, 3.5, 9, 11, 14 and up, and every other number)
   round to the nearest step, or, better, to a page rhythm step: `px-cmn-page-gutter`,
   `gap-cmn-section-gap`, `gap-cmn-group-gap`, `mt-cmn-title-gap`. Space between a page's blocks
   belongs to `cmn-page`, not to the page; see `docs/PHONE-CONTRACT.md`.

4. **Rename type sizes.** `text-xs` is `text-cmn-xs`, `text-sm` is `text-cmn-sm`, `text-base` is
   `text-cmn-md`, `text-lg` and `text-xl` are `text-cmn-lg`, `text-2xl` is `text-cmn-2xl`,
   `text-3xl` is `text-cmn-3xl`, `text-4xl` is `text-cmn-4xl`. The ramp is Carbon's productive scale
   (12, 14, 16, 20, 28, 32, 42px), so sizes the ramp does not have round to the nearest step.

5. **Sizing is unchanged.** `w-*`, `h-*`, `size-*`, `min-*`, `max-*` and `basis-*` size an element
   (a dot, an avatar, a bar), not the space around it, and keep Tailwind's numeric scale, plus the
   `cmn-*` steps and control heights. `w-8` and `h-2` still work and need no change.

6. **Replace `cmn-page-container`** with `cmn-page`:

   | Before                                     | After                                          |
   | ------------------------------------------ | ---------------------------------------------- |
   | `<cmn-page-container spacing="none" fill>` | `<cmn-page kind="list" fill>`                  |
   | `<cmn-page-container>` (default `md`)      | `<cmn-page kind="...">` (the page's archetype) |
   | `maxWidth`, `spacing`                      | gone: the `kind` sets the width and the rhythm |

   Pick the `kind` that names the screen (`list`, `detail`, `form`, `settings`, `overview`). A page
   sets no padding, margin or width of its own.

7. **Lint.** `lifekit/page-root` is now an error. A surface that is not a shell page (a sign-in
   screen, a chat canvas) keeps a scoped override with a comment saying why:

   ```js
   {
     files: ['src/app/modules/auth/pages/**'],
     rules: {'lifekit/page-root': 'off'},
   }
   ```

8. **Verify.** `ng lint`, the app's unit tests, its screen check (`@lifekit-hq/tokens/screen`, rule
   C0 fails a route not built on `cmn-page`), and `npx lifekit-chrome-check drift src` with no findings.

## For the library itself

Inside this repo the components were migrated the same way. Where a component used a half step with
no `cmn-*` equivalent (6px, 10px, 14px), it moved to the nearest step: `1.5` to `cmn-2`, `2.5` to
`cmn-3`, `3.5` to `cmn-4`.
