/**
 * Design drift check: the static half of the lifekit design contract, for any consumer's source.
 * It finds what bypasses the tokens, with no browser (contrast needs one and is not checked here):
 *
 *   font-family           a font stack that does not start from var(--font-*)
 *   color                 a colour literal in CSS or TS (not templates, inline `template:` included)
 *                         that is not the var(--x, #hex) fallback mirroring its own token
 *   text-size             text below 12px, or off the cmn-* type ramp, and a Tailwind default text
 *                         class (`text-sm`, `text-lg`) the preset replaced
 *   radius                a radius off the --radius-* scale
 *   root-font-size        `html { font-size }`: the rem scale assumes the 16px root
 *   layout-transition     a transition on width or height
 *   spacing               a padding, margin, gap or inset length off the spacing scale, and a
 *                         Tailwind default-scale class (`p-4`, `gap-2`, `-mt-1`) the preset replaced
 *   error-copy            a TS prose string that says please, sorry, oops, valid or invalid
 *                         (not in an inline template)
 *
 * Token definitions (`--custom-property: …`) and `@font-face` are the contract itself, not drift.
 */
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {extname, join, relative, sep} from 'node:path';

import {
  blank,
  blankCallMirrors,
  colourLiterals,
  errorCopyMessage,
  fontFamilyMessage,
  fontShorthandParts,
  layoutTransitionMessage,
  radiusMessage,
  rootFontSizeMessage,
  spacingMessage,
  textSizeMessage,
} from './rules.mjs';
import {extractStrings, lineAt, maskComments, parseDeclarations} from './source.mjs';

export {RADIUS_SCALE_PX, SPACING_SCALE_PX, TEXT_FLOOR_PX, TEXT_RAMP_PX} from './rules.mjs';

export const DRIFT_RULES = [
  'font-family',
  'color',
  'text-size',
  'radius',
  'root-font-size',
  'layout-transition',
  'spacing',
  'error-copy',
];

const SCANNED = new Set(['.css', '.scss', '.ts', '.tsx', '.html']);
const SKIPPED_FILE = /\.(?:spec|test|stories)\.[cm]?[jt]sx?$|\.d\.ts$/;
const SKIPPED_DIR = new Set(['node_modules', 'dist', 'storybook-static', 'coverage']);

const SPACING_PROP =
  /^(?:padding|margin|scroll-padding|scroll-margin)(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?$|^(?:row-|column-)?gap$|^inset(?:-(?:inline|block)(?:-(?:start|end))?)?$/;
const RADIUS_PROP =
  /^border-(?:(?:top|bottom)-(?:left|right)|(?:start|end)-(?:start|end))-radius$|^border-radius$/;
const TS_KEYS = [
  'fontFamily',
  'fontSize',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'transition',
  'transitionProperty',
  'padding',
  'margin',
  'gap',
];
const TS_KEY = new RegExp(
  `(?<![\\w$.-])(${TS_KEYS.join('|')})\\s*:\\s*(?:(['"\`])((?:\\\\.|(?!\\2)[^\\\\])*)\\2|(\\d+(?:\\.\\d+)?)(?![\\w.%]))`,
  'g'
);
const TS_TEMPLATE = /(?<![\w$.-])template\s*:\s*['"`]/g;
const CHART_FONT = /(?<![\w$.-])font\s*:\s*\{[^{}]*\}/g;
const kebab = name => name.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);

/** `[{rule, message}]` for one CSS-shaped declaration. */
function declarationProblems({selector = '', atRules = [], prop, value}) {
  const problems = [];
  const add = (rule, message) => message && problems.push({rule, message});
  const addSize = size => {
    const root = rootFontSizeMessage(selector, size);
    if (root) add('root-font-size', root);
    else add('text-size', textSizeMessage(size));
  };
  if (atRules.some(rule => rule.startsWith('@font-face'))) return problems;
  if (prop === 'font-family') add('font-family', fontFamilyMessage(value));
  else if (prop === 'font-size') addSize(value);
  else if (prop === 'font') {
    const parts = fontShorthandParts(value);
    if (parts) {
      addSize(parts.size);
      add('font-family', fontFamilyMessage(parts.family));
    }
  } else if (RADIUS_PROP.test(prop)) add('radius', radiusMessage(value));
  else if (SPACING_PROP.test(prop)) add('spacing', spacingMessage(value));
  else if (prop === 'transition' || prop === 'transition-property') {
    add('layout-transition', layoutTransitionMessage(value));
  }
  return problems;
}

// The utilities that read the spacing scale, which the preset replaces (sizing keeps Tailwind's
// numeric scale: `w-8`, `h-2`, `size-3` and the like are not here).
const SPACING_UTILITIES =
  'p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y|top|right|bottom|left|inset|inset-x|inset-y|start|end|translate-x|translate-y|indent|scroll-m[trblxy]?|scroll-p[trblxy]?';
const DEFAULT_SPACING_CLASS = new RegExp(
  `(?<![\\w\\-\\[/.])((?:[a-z0-9-]+:)*!?-?(?:${SPACING_UTILITIES}))-(\\d+(?:\\.\\d+)?)(?![\\w\\-\\[/]|\\.\\d)`,
  'g'
);
const DEFAULT_TEXT_CLASS =
  /(?<![\w\-[/.])(?:[a-z0-9-]+:)*!?text-(xs|sm|base|lg|xl|[2-9]xl)(?![\w\-[])/g;
const CMN_SPACING_STEPS = new Set([
  '0.5',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '10',
  '12',
  '16',
]);

/** Tailwind classes the preset no longer generates: default spacing steps and default text sizes. */
function* removedScaleClassProblems(text) {
  for (const match of text.matchAll(DEFAULT_SPACING_CLASS)) {
    const [, utility, step] = match;
    if (step === '0') continue;
    const bare = utility.replace(/^.*:/, '');
    const use = CMN_SPACING_STEPS.has(step)
      ? `${bare}-cmn-${step}`
      : 'a cmn-* spacing step or a --cmn-* page rhythm token';
    yield {
      rule: 'spacing',
      message: `${bare}-${step} is Tailwind's default spacing, which the lifekit preset replaces (5.0), so the class generates nothing; use ${use}`,
      offset: match.index,
    };
  }
  for (const match of text.matchAll(DEFAULT_TEXT_CLASS)) {
    yield {
      rule: 'text-size',
      message: `text-${match[1]} is Tailwind's default type size, which the lifekit preset replaces (5.0), so the class generates nothing; use a text-cmn-* step`,
      offset: match.index,
    };
  }
}

/** Tailwind arbitrary values (`text-[10px]`, `rounded-[10px]`, `transition-[width]`, `font-['X']`). */
function* arbitraryClassProblems(text) {
  const rules = [
    [/(?<![\w-])text-\[(?:length:)?(-?[\d.]+(?:px|rem|em|pt|%)?)\]/g, 'text-size', textSizeMessage],
    [
      /(?<![\w-])rounded(?:-(?:[trblse]|tl|tr|bl|br|ss|se|es|ee))?-\[([^\]\s]+)\]/g,
      'radius',
      value => radiusMessage(value.replace(/_/g, ' ')),
    ],
    [
      /(?<![\w-])transition-\[([^\]\s]+)\]/g,
      'layout-transition',
      value => layoutTransitionMessage(value.replace(/[_,]/g, ' ')),
    ],
    [
      /(?<![\w-])-?(?:p|m|gap|space|inset|scroll-p|scroll-m)(?:-?[xytrblse])?-\[(-?[\d.]+(?:px|rem))\]/g,
      'spacing',
      spacingMessage,
    ],
    [
      /(?<![\w-])font-\[(?:family-name:)?(['"]?[a-z][^\]\s]*)\]/gi,
      'font-family',
      value =>
        value.startsWith('var(') || value.startsWith('--') ? null : fontFamilyMessage(value),
    ],
  ];
  for (const [pattern, rule, check] of rules) {
    for (const match of text.matchAll(pattern)) {
      const message = check(match[1]);
      if (message) yield {rule, message, offset: match.index};
    }
  }
  yield* removedScaleClassProblems(text);
}

/** Declarations written as `style="…"` attributes. */
function* styleAttributeProblems(text) {
  for (const match of text.matchAll(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    const body = match[1] ?? match[2];
    for (const declaration of parseDeclarations(body)) {
      for (const problem of declarationProblems(declaration)) {
        yield {...problem, offset: match.index, lines: declaration.line - 1};
      }
    }
  }
}

/** Colour literals in CSS declarations, and in TS strings (custom-property definitions aside). */
function colourProblems(values) {
  return values.flatMap(({text, line}) =>
    colourLiterals(blank(text, /--[\w-]+\s*:[^;}]*/g)).map(({literal, index}) => ({
      rule: 'color',
      message: `colour literal ${literal} bypasses the tokens; use var(--color-*)`,
      line: line + lineAt(text, index) - 1,
    }))
  );
}

function scanCss(text, scss) {
  const declarations = parseDeclarations(text, {lineComments: scss});
  return [
    ...declarations.flatMap(declaration =>
      declarationProblems(declaration).map(problem => ({...problem, line: declaration.line}))
    ),
    ...colourProblems(
      declarations
        .filter(d => !d.atRules.some(rule => rule.startsWith('@font-face')))
        .map(d => ({text: d.value, line: d.line}))
    ),
  ];
}

function scanHtml(text) {
  return [...arbitraryClassProblems(text), ...styleAttributeProblems(text)].map(
    ({offset, lines = 0, ...problem}) => ({...problem, line: lineAt(text, offset) + lines})
  );
}

function scanTypeScript(text) {
  const found = [];
  const masked = maskComments(text);
  for (const match of masked.matchAll(TS_KEY)) {
    const [, key, , quoted, bare] = match;
    if (quoted?.includes('${')) continue;
    const value = quoted ?? `${bare}px`;
    if (bare !== undefined && key !== 'fontSize') continue;
    const line = lineAt(masked, match.index);
    for (const problem of declarationProblems({prop: kebab(key), value}))
      found.push({...problem, line});
  }
  for (const block of masked.matchAll(CHART_FONT)) {
    const size = /(?<![\w$])size\s*:\s*(\d+(?:\.\d+)?)(?![\w.%])/.exec(block[0]);
    const family = /(?<![\w$])family\s*:\s*(['"`])((?:(?!\1).)*)\1/.exec(block[0]);
    const line = lineAt(masked, block.index);
    const checks = [
      size && ['text-size', textSizeMessage(`${size[1]}px`)],
      family && !family[2].includes('${') && ['font-family', fontFamilyMessage(family[2])],
    ];
    for (const check of checks)
      if (check?.[1]) found.push({rule: check[0], message: check[1], line});
  }
  const templates = new Set(
    [...masked.matchAll(TS_TEMPLATE)].map(match => match.index + match[0].length - 1)
  );
  const strings = extractStrings(blankCallMirrors(text));
  for (const {text: body, line} of strings) {
    for (const declaration of parseDeclarations(body, {firstLine: line})) {
      for (const problem of declarationProblems(declaration)) {
        found.push({...problem, line: declaration.line});
      }
    }
    for (const problem of [...arbitraryClassProblems(body), ...styleAttributeProblems(body)]) {
      found.push({
        rule: problem.rule,
        message: problem.message,
        line: line + lineAt(body, problem.offset) - 1 + (problem.lines ?? 0),
      });
    }
  }
  const literals = strings.filter(({start}) => !templates.has(start));
  found.push(...colourProblems(literals));
  for (const {text: body, line} of literals) {
    const message = errorCopyMessage(body);
    if (message) found.push({rule: 'error-copy', message, line});
  }
  for (const match of masked.matchAll(/documentElement\.style\.fontSize\s*=/g)) {
    found.push({
      rule: 'root-font-size',
      message: 'sets the root font-size from script; the rem scale assumes the 16px root',
      line: lineAt(masked, match.index),
    });
  }
  return found;
}

/** Drift in one file's source text. `file` selects the language by extension. */
export function scanSource(file, text) {
  const ext = extname(file).toLowerCase();
  const found =
    ext === '.css' || ext === '.scss'
      ? scanCss(text, ext === '.scss')
      : ext === '.html'
        ? scanHtml(text)
        : scanTypeScript(text);
  const seen = new Set();
  return found
    .filter(
      ({rule, message, line}) =>
        !seen.has(`${rule}|${line}|${message}`) && seen.add(`${rule}|${line}|${message}`)
    )
    .sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule))
    .map(problem => ({file, ...problem}));
}

function* walk(path) {
  if (statSync(path).isFile()) {
    yield path;
    return;
  }
  for (const entry of readdirSync(path, {withFileTypes: true}).sort((a, b) =>
    a.name.localeCompare(b.name)
  )) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIR.has(entry.name) && !entry.name.startsWith('.'))
        yield* walk(join(path, entry.name));
    } else if (SCANNED.has(extname(entry.name).toLowerCase()) && !SKIPPED_FILE.test(entry.name)) {
      yield join(path, entry.name);
    }
  }
}

/**
 * Scans files and directories (recursively; build output, specs, stories and dot-directories are
 * skipped). Returns `{files, findings}` where each finding is `{file, line, rule, message}`.
 */
export function checkDrift(paths, {cwd = process.cwd()} = {}) {
  const findings = [];
  let files = 0;
  for (const path of paths) {
    for (const file of walk(path)) {
      files++;
      const shown = relative(cwd, file).split(sep).join('/');
      findings.push(...scanSource(shown, readFileSync(file, 'utf8')));
    }
  }
  return {files, findings};
}
