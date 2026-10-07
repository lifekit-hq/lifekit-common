# Third-party notices

## impeccable

The design drift check (`drift/`, run as `lifekit-chrome-check drift`) adapts rule logic from
[impeccable](https://github.com/pbakaus/impeccable) by Paul Bakaus, version 0.1.11, licensed under
the Apache License 2.0 (copyright 2025 Paul Bakaus). The licence text is in
[`LICENSES/impeccable-APACHE-2.0.txt`](LICENSES/impeccable-APACHE-2.0.txt).

Adapted from impeccable's rule logic: the layout-property transition matcher, and the
design-system checks on arbitrary font size, radius and colour (a value that is not a design-system
step is drift; `var()`, `0`, percentages and pills pass). The exact sources are named in the header
of [`drift/rules.mjs`](drift/rules.mjs).

Changes: reimplemented in JavaScript with no dependency on impeccable's engine; the type ramp,
radius scale and palette come from this package's preset and `theme.css` instead of a `DESIGN.md`;
`layout-transition` covers `width`, `height` and their `min-`/`max-` forms only; colour, text size
and radius are also read from TypeScript strings, Tailwind arbitrary values and Chart.js font
options. The `font-family` and `root-font-size` rules are lifekit's own and are not derived from
impeccable.
