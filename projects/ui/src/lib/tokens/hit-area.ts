/**
 * Below md, grows a small control's pressable area to at least `--size-touch` square around it
 * without changing how it looks or where it sits: a centred `::after` takes the touches, the same
 * box as the `cmn-hit-slop` class in `@lifekit-hq/tokens/base.css`. The control becomes the
 * positioning context and must not clip overflow; a neighbour closer than the target overlaps it.
 */
export const PHONE_HIT_AREA_CLASSES =
  'max-md:relative max-md:after:absolute max-md:after:left-1/2 max-md:after:top-1/2 ' +
  'max-md:after:h-cmn-touch max-md:after:w-cmn-touch max-md:after:min-h-full ' +
  'max-md:after:min-w-full max-md:after:-translate-x-1/2 max-md:after:-translate-y-1/2';
