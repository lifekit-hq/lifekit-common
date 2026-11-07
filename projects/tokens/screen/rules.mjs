/**
 * The screen-composition rules: deterministic checks of a fully rendered screen (an app route, not
 * an isolated story), each tied to a sentence in DESIGN.md or the HIG that was prose only before.
 * They measure the unit the owner looks at: the composed page.
 *
 * `inspectScreen` runs inside the page (Playwright's `page.evaluate`), so it is self-contained: it
 * uses nothing from this module's scope. Everything else here is plain data for the Node side.
 */

/** Each rule, its short name and the sentence it enforces. */
export const SCREEN_RULES = [
  {
    id: 'C0',
    name: 'page-template',
    says: 'DESIGN.md Layout: every routed page sits in a page template, `cmn-page`.',
  },
  {
    id: 'C1',
    name: 'one-left-edge',
    says: "DESIGN.md Layout: the title, the notices and the content share the page's left edge; a template's kind names the columns content may start on.",
  },
  {
    id: 'C2',
    name: 'title-clearance',
    says: 'DESIGN.md Layout: the title gap (at least 16px) sits under the large title.',
  },
  {
    id: 'C3',
    name: 'touching-blocks',
    says: 'DESIGN.md Layout: stacked surfaces keep at least the group gap (8px) apart.',
  },
  {
    id: 'C4',
    name: 'row-height-parity',
    says: 'DESIGN.md Layout: controls side by side share one height (`--cmn-control-h`).',
  },
  {
    id: 'C5',
    name: 'stretched-input',
    says: 'DESIGN.md Layout: a text field keeps a reading width (at most 640px), never a phone layout stretched to the desktop.',
  },
  {
    id: 'C6',
    name: 'nested-surface',
    says: 'DESIGN.md Components, Cards: never nested.',
  },
  {
    id: 'C7',
    name: 'uppercase-label',
    says: 'DESIGN.md Typography: no uppercase or tracked micro-labels.',
  },
  {
    id: 'C8',
    name: 'heading-rhythm',
    says: 'DESIGN.md Layout: more space above a heading than below it.',
  },
  {
    id: 'C9',
    name: 'row-action-noise',
    says: "DESIGN.md Components: a row's action is a quiet trailing icon, not a bordered text button repeated on three or more rows.",
  },
  {
    id: 'C10',
    name: 'text-escapes',
    says: 'HIG Layout: content stays inside its container; no text runs past its surface.',
  },
];

/**
 * Runs in the browser: inspects the rendered screen under `main` and returns what breaks the rules.
 *
 * With a page template (`[data-cmn-page]`, drawn by `cmn-page`) the check knows the intended
 * columns from the template (`[data-cmn-page-column]`) and its kind: every notice, the title and
 * every top-level block must start on a declared column. Without one it reports C0 and falls back
 * to the title's left edge as the reference.
 *
 * @param {{kind?: string | null, ignore?: string[]}} [options]
 * @returns {{kind: string | null, template: boolean, findings: {rule: string, message: string}[]}}
 */
export function inspectScreen(options = {}) {
  // The columns each template kind declares, by name: a page's column is `main` unless its
  // `data-cmn-page-column` names another. The overview's `rail` is optional; every other column
  // is drawn whenever the page is. A kind not listed here is still checked against the columns its
  // page declares, only without a count or names to hold it to.
  const KIND_COLUMNS = {
    list: ['main'],
    detail: ['main'],
    form: ['main'],
    settings: ['main'],
    overview: ['main', 'rail'],
  };
  const OPTIONAL_COLUMNS = new Set(['rail']);
  const TITLE_GAP_MIN = 16;
  const SURFACE_GAP_MIN = 8;
  const HEIGHT_TOLERANCE = 1;
  const EDGE_TOLERANCE = 1;
  const INPUT_MAX = 640;
  const ROW_ACTION_REPEAT = 3;
  // C8: a heading's own section. C9: a row, and the list of rows it repeats in.
  const SECTION_SELECTOR =
    'section, fieldset, [role=group], [role=region], cmn-settings-section, cmn-list-section';
  const ROW_SELECTOR = 'li, tr, [role=listitem], [role=row], cmn-list-item-row';
  const ROW_LIST_SELECTOR =
    'cmn-list-section, ul, ol, table, [role=list], [role=table], [role=grid], [role=rowgroup]';
  const ROW_CENTRE_TOLERANCE = 6;
  const ROW_NEIGHBOUR_GAP = 24;
  const CONTROL_MIN_HEIGHT = 28;
  const SURFACE_MIN_WIDTH = 120;
  const SURFACE_MIN_HEIGHT = 40;
  const BLOCK_MIN_WIDTH = 200;
  const OVERLAP_MIN = 40;
  const TEXT_OVERFLOW_TOLERANCE = 2;
  const NAME_TEXT = 28;

  const ignore = new Set(options.ignore ?? []);
  const findings = [];
  const add = (rule, message) => {
    if (!ignore.has(rule)) findings.push({rule, message});
  };
  const R = el => el.getBoundingClientRect();
  const vis = el => {
    const r = R(el);
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  const text = el => (el.textContent || '').trim().replace(/\s+/g, ' ');
  const name = el => {
    const cls =
      typeof el.className === 'string' && el.className.trim()
        ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
        : '';
    return `${el.tagName.toLowerCase()}${cls} "${text(el).slice(0, NAME_TEXT)}"`;
  };
  const isSurface = el => {
    if (!vis(el)) return false;
    if (/^(INPUT|BUTTON|TEXTAREA|SELECT|A|LABEL|SPAN)$/.test(el.tagName)) return false;
    if (
      el.closest(
        'button, [role=button], cmn-button, cmn-tag, cmn-chip, cmn-badge, cmn-input, ' +
          'cmn-search-input, cmn-select, cmn-checkbox, cmn-segmented, nav, header, aside, ' +
          'cmn-top-bar, cmn-bottom-tab-bar, cmn-sidebar-nav'
      )
    ) {
      return false;
    }
    const cs = getComputedStyle(el);
    const bordered = ['Top', 'Right', 'Bottom', 'Left'].every(
      side => parseFloat(cs[`border${side}Width`]) >= 1 && cs[`border${side}Style`] !== 'none'
    );
    const r = R(el);
    return bordered && r.width >= SURFACE_MIN_WIDTH && r.height >= SURFACE_MIN_HEIGHT;
  };
  /** The boxes a container lays out: its children, looking through `display: contents`. */
  const blocksOf = container => {
    const out = [];
    for (const child of container.children) {
      if (getComputedStyle(child).display === 'contents') out.push(...blocksOf(child));
      else if (vis(child)) out.push(child);
    }
    return out;
  };
  const inDialog = el => el.closest('cmn-dialog, cmn-drawer, [role=dialog]');

  const main = document.querySelector('main') || document.body;
  const page = main.querySelector('[data-cmn-page]');
  const kind = options.kind || (page && page.getAttribute('data-cmn-page')) || null;
  const notices = [...main.querySelectorAll('[data-cmn-notices] > *')].filter(vis);
  const title =
    (page && [...page.querySelectorAll('[data-cmn-page-title]')].find(vis)) ||
    [...main.querySelectorAll('h1')].find(vis) ||
    null;
  const surfaces = [...main.querySelectorAll('*')].filter(el => isSurface(el) && !inDialog(el));
  const outer = surfaces.filter(s => !surfaces.some(o => o !== s && o.contains(s)));

  // Top-level blocks: a template's column children, or (without one) the prototype's guess.
  let blocks;
  if (page) {
    blocks = [...page.querySelectorAll('[data-cmn-page-column]')].filter(vis).flatMap(blocksOf);
  } else {
    blocks = [
      ...main.querySelectorAll(
        'form, p, h2, h3, section, [role=region], cmn-card, cmn-list-section, cmn-empty-state, ' +
          'cmn-alert, cmn-settings-section, input, cmn-input'
      ),
    ]
      .filter(vis)
      .filter(el => !inDialog(el));
  }

  // C0 page template
  if (!page) add('C0', 'the screen is not built on a page template (no cmn-page under main)');

  // C1 one left edge
  if (page) {
    const columns = [...page.querySelectorAll('[data-cmn-page-column]')].filter(vis);
    const declared = KIND_COLUMNS[kind];
    if (declared) {
      const names = columns.map(column => column.getAttribute('data-cmn-page-column') || 'main');
      const required = declared.filter(column => !OPTIONAL_COLUMNS.has(column));
      const unknown = names.filter(column => !declared.includes(column));
      const twice = names.filter((column, i) => names.indexOf(column) !== i);
      const missing = required.filter(column => !names.includes(column));
      const a = /^[aeiou]/.test(kind) ? 'an' : 'a';
      if (columns.length > declared.length || columns.length < required.length) {
        add(
          'C1',
          `${a} ${kind} page has ${declared.length} column(s); this one has ${columns.length}`
        );
      } else if (unknown.length || twice.length || missing.length) {
        add(
          'C1',
          `${a} ${kind} page has the columns ${declared.join(', ')}; this one has ${names.join(', ')}`
        );
      }
    }
    const edges = columns.map(column => Math.round(R(column).left));
    const onAnEdge = x => edges.some(edge => Math.abs(x - edge) <= EDGE_TOLERANCE);
    if (edges.length) {
      for (const el of [...(title ? [title] : []), ...notices]) {
        const x = Math.round(R(el).left);
        if (!onAnEdge(x))
          add(
            'C1',
            `left edge ${x}px is off the page's columns (${edges.join(', ')}px): ${name(el)}`
          );
      }
      for (const column of columns) {
        const x0 = Math.round(R(column).left);
        for (const el of blocksOf(column)) {
          const x = Math.round(R(el).left);
          if (Math.abs(x - x0) > EDGE_TOLERANCE)
            add('C1', `left edge ${x}px vs its column ${x0}px: ${name(el)}`);
        }
      }
    }
  } else if (title) {
    const x0 = Math.round(R(title).left);
    const firstLevel = [
      ...new Set(
        [...blocks, ...notices].map(el => {
          let e = el;
          while (
            e.parentElement &&
            e.parentElement !== main &&
            R(e.parentElement).left === R(e).left &&
            R(e.parentElement).width === R(e).width
          ) {
            e = e.parentElement;
          }
          return e;
        })
      ),
    ];
    const lefts = new Map();
    for (const el of [...firstLevel, ...outer]) {
      const x = Math.round(R(el).left);
      if (Math.abs(x - x0) > EDGE_TOLERANCE && R(el).width > BLOCK_MIN_WIDTH)
        lefts.set(x, name(el));
    }
    for (const [x, label] of lefts) add('C1', `left edge ${x}px vs title ${x0}px: ${label}`);
  }

  // C2 title clearance
  if (title) {
    const below = [...blocks, ...outer]
      .filter(el => R(el).top >= R(title).bottom - 2 && !title.contains(el) && !el.contains(title))
      .sort((a, b) => R(a).top - R(b).top)[0];
    if (below) {
      const gap = Math.round(R(below).top - R(title).bottom);
      if (gap < TITLE_GAP_MIN) add('C2', `title "${text(title)}" to ${name(below)}: ${gap}px`);
    }
  }

  // C3 touching stacked surfaces (outermost only). Each is measured against the nearest surface
  // above it in the same column, so a second column's surfaces never stand between the two.
  const stacked = [...outer].sort((a, b) => R(a).top - R(b).top);
  for (let i = 1; i < stacked.length; i++) {
    const b = R(stacked[i]);
    const above = stacked
      .slice(0, i)
      .filter(el => Math.min(R(el).right, b.right) - Math.max(R(el).left, b.left) > OVERLAP_MIN)
      .sort((x, y) => R(y).bottom - R(x).bottom)[0];
    if (!above) continue;
    const gap = Math.round(b.top - R(above).bottom);
    if (gap >= -1 && gap < SURFACE_GAP_MIN) {
      add('C3', `${gap}px between ${name(above)} and ${name(stacked[i])}`);
    }
  }

  // C4 row height parity
  const controls = [
    ...main.querySelectorAll(
      'input:not([type=checkbox]):not([type=radio]):not([type=range]), button, select, textarea'
    ),
  ].filter(el => vis(el) && R(el).height >= CONTROL_MIN_HEIGHT);
  const seen = new Set();
  for (const a of controls) {
    for (const b of controls) {
      if (a === b) continue;
      const ra = R(a);
      const rb = R(b);
      const sameRow =
        Math.abs(ra.top + ra.height / 2 - (rb.top + rb.height / 2)) < ROW_CENTRE_TOLERANCE &&
        Math.abs(ra.right - rb.left) < ROW_NEIGHBOUR_GAP;
      if (sameRow && Math.abs(ra.height - rb.height) > HEIGHT_TOLERANCE) {
        const key = `${Math.round(ra.height)}/${Math.round(rb.height)}@${Math.round(ra.top)}`;
        if (!seen.has(key)) {
          seen.add(key);
          add(
            'C4',
            `${name(a)} ${Math.round(ra.height)}px next to ${name(b)} ${Math.round(rb.height)}px`
          );
        }
      }
    }
  }

  // C5 stretched input
  for (const field of main.querySelectorAll(
    'input[type=text], input:not([type]), input[type=search], input[type=email], textarea'
  )) {
    if (vis(field) && R(field).width > INPUT_MAX) {
      const label = field.getAttribute('placeholder') || field.getAttribute('aria-label') || '';
      add('C5', `input ${Math.round(R(field).width)}px wide: ${label}`);
    }
  }

  // C6 nested surfaces
  const nested = surfaces.filter(s => surfaces.some(o => o !== s && o.contains(s)));
  if (nested.length)
    add('C6', `${nested.length} bordered surface(s) inside another, e.g. ${name(nested[0])}`);

  // C7 uppercase labels
  const upper = [...main.querySelectorAll('*')].filter(
    el =>
      vis(el) &&
      el.childElementCount === 0 &&
      text(el).length > 2 &&
      getComputedStyle(el).textTransform === 'uppercase' &&
      !el.closest('cmn-account-avatar, cmn-institution-avatar')
  );
  if (upper.length) {
    const labels = [...new Set(upper.map(text))].slice(0, 4).join(' | ');
    add('C7', `${upper.length} uppercase label(s): ${labels}`);
  }

  // C8 heading rhythm
  const everything = [...main.querySelectorAll('*')].filter(el => vis(el) && R(el).height > 8);
  for (const heading of [...main.querySelectorAll('h2, h3')].filter(vis)) {
    const h = R(heading);
    const near = everything.filter(
      el =>
        !heading.contains(el) &&
        !el.contains(heading) &&
        Math.min(R(el).right, h.right) - Math.max(R(el).left, h.left) > 20
    );
    const above = near
      .filter(el => R(el).bottom <= h.top + 1)
      .sort((a, b) => R(b).bottom - R(a).bottom)[0];
    // Below a heading is the content it heads, so only its own section counts: in a template that
    // puts the heading in a column beside its controls (settings), whatever lies under it in that
    // column is the next section's heading, not the content.
    const own = heading.closest(SECTION_SELECTOR) || main;
    const below = near
      .filter(el => own.contains(el) && R(el).top >= h.bottom - 1)
      .sort((a, b) => R(a).top - R(b).top)[0];
    if (above && below) {
      const up = Math.round(h.top - R(above).bottom);
      const down = Math.round(R(below).top - h.bottom);
      if (up < down) add('C8', `"${text(heading).slice(0, 30)}": ${up}px above < ${down}px below`);
    }
  }

  // C9 a bordered text button repeated per row
  // The unit is the row (a list item, a table row, a `cmn-list-item-row`), not the list or section
  // around it: one card's several actions are one row's, not an action repeated per row.
  const groups = new Map();
  for (const button of [...main.querySelectorAll('button')].filter(vis)) {
    if (parseFloat(getComputedStyle(button).borderTopWidth) < 1 || !text(button)) continue;
    const row = button.closest(ROW_SELECTOR);
    const list = row && row.parentElement && row.parentElement.closest(ROW_LIST_SELECTOR);
    if (!list) continue;
    if (!groups.has(list)) groups.set(list, new Set());
    groups.get(list).add(row);
  }
  for (const [list, rows] of groups) {
    if (rows.size >= ROW_ACTION_REPEAT)
      add('C9', `${rows.size} bordered text buttons repeated in ${name(list)}`);
  }

  // C10 text escaping its surface
  for (const surface of outer) {
    const box = R(surface);
    for (const leaf of surface.querySelectorAll('*')) {
      if (!vis(leaf) || leaf.childElementCount || !text(leaf)) continue;
      const r = R(leaf);
      if (r.right > box.right + TEXT_OVERFLOW_TOLERANCE) {
        add(
          'C10',
          `text runs ${Math.round(r.right - box.right)}px past ${name(surface)}: "${text(leaf).slice(0, 30)}"`
        );
        break;
      }
    }
  }

  return {kind, template: !!page, findings};
}
