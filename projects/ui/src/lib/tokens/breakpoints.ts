/**
 * Media query for the Tailwind `md` breakpoint (768px). Below it, responsive
 * components switch to their phone layout (data-table list rows, drawer sheet).
 */
export const CMN_MEDIA_MD = '(min-width: 768px)';

/*
 * The app shell follows the Material 3 window size classes: compact (under 600px) is the phone
 * shell, medium (600-839px) the navigation rail, expanded (840px and up) the full sidebar.
 */

/** Medium window size class and up (600px): the shell leaves the phone layout. */
export const CMN_MEDIA_MEDIUM = '(min-width: 600px)';

/** Expanded window size class (840px): the rail opens into the full sidebar. */
export const CMN_MEDIA_EXPANDED = '(min-width: 840px)';

/**
 * A landscape phone: touch is the primary pointer and the viewport is short. Wider than the
 * medium class, it still belongs in the phone shell. The width cap keeps a tablet whose on-screen
 * keyboard shrinks the viewport below the height limit out of the phone shell.
 */
export const CMN_MEDIA_PHONE_LANDSCAPE =
  '(pointer: coarse) and (max-height: 500px) and (max-width: 960px)';
