/**
 * Icon check: fails when an app uses a Lucide icon name that `<cmn-icon>` would render empty.
 *
 * `<cmn-icon>` renders the library's generated Lucide subset (lucide-icons.json, written by the
 * library's own icon generator) plus whatever the app registers with `provideLucideIcons`. A name
 * outside both draws an empty box, and only in dev mode does anything say so. This reads an app's
 * source and reports each quoted PascalCase string that is a Lucide icon name and is in neither set.
 * No browser, no Lucide install: the Lucide catalog ships beside the subset.
 *
 * Reported (`rule`):
 *
 *   missing-icon        a Lucide icon name the app uses, outside the subset and the app's own
 *                       `provideLucideIcons` / `new LucideIconProvider` registrations
 *   registration        a registration this scan cannot read (a spread, a computed key, or a
 *                       value that is not an object literal), so the names it registers are unknown
 */
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {extname, join, relative, sep} from 'node:path';

import {lineAt, maskComments} from '../drift/source.mjs';

const {subset, catalog} = JSON.parse(
  readFileSync(new URL('./lucide-icons.json', import.meta.url), 'utf8')
);

export const ICON_RULES = ['missing-icon', 'registration'];
/** The Lucide icons `<cmn-icon>` renders without the app registering anything. */
export const ICON_SUBSET = new Set(subset);
const CATALOG = new Set(catalog);

const SCANNED = new Set(['.ts', '.tsx', '.html']);
const SKIPPED_FILE = /\.(?:spec|test|stories)\.[cm]?[jt]sx?$|\.d\.ts$/;
const SKIPPED_DIR = new Set(['node_modules', 'dist', 'storybook-static', 'coverage']);
const QUOTED_PASCAL = /(['"`])([A-Z][A-Za-z0-9]*)\1/g;
const REGISTRATION = /\b(?:provideLucideIcons|LucideIconProvider)\s*\(/g;
const ENTRY_KEY = /^(?:([A-Za-z_$][\w$]*)|'([^']+)'|"([^"]+)")\s*(?::|$)/;
const OPENERS = {'(': ')', '[': ']', '{': '}'};
const CLOSERS = new Set(Object.values(OPENERS));

/** HTML comments blanked, newlines kept, so offsets and line numbers survive. */
const maskHtmlComments = text => text.replace(/<!--[\s\S]*?-->/g, c => c.replace(/[^\n]/g, ' '));

/** The source text with its comments blanked (TypeScript: `//` and block; HTML: `<!-- -->`). */
function masked(file, text) {
  return extname(file).toLowerCase() === '.html'
    ? maskHtmlComments(text)
    : maskComments(text, {lineComments: true});
}

/** The text between the parenthesis at `open` and its match, or null when it never closes. */
function balanced(text, open) {
  const stack = [];
  let quote = null;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'" || c === '`') {
      quote = c;
    } else if (OPENERS[c]) {
      stack.push(OPENERS[c]);
    } else if (CLOSERS.has(c)) {
      if (stack.pop() !== c) return null;
      if (stack.length === 0) return text.slice(open + 1, i);
    }
  }
  return null;
}

/** The top-level comma-separated entries of an object-literal body. */
function entries(body) {
  const out = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i <= body.length; i++) {
    const c = body[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'" || c === '`') {
      quote = c;
    } else if (c !== undefined && OPENERS[c]) {
      depth++;
    } else if (c !== undefined && CLOSERS.has(c)) {
      depth--;
    } else if ((c === ',' && depth === 0) || c === undefined) {
      out.push(body.slice(start, i).trim());
      start = i + 1;
    }
  }
  return out.filter(Boolean);
}

/**
 * The icon names one `provideLucideIcons(…)` / `new LucideIconProvider(…)` call registers
 * (the keys of its object literal), or `{unreadable}` when they cannot be read from source.
 */
function registeredNames(argument) {
  const body = argument.trim();
  if (!body.startsWith('{') || !body.endsWith('}')) return {unreadable: true, names: []};
  const names = [];
  for (const entry of entries(body.slice(1, -1))) {
    const key = ENTRY_KEY.exec(entry);
    if (!key) return {unreadable: true, names: []};
    names.push(key[1] ?? key[2] ?? key[3]);
  }
  return {unreadable: false, names};
}

/**
 * Reads one file: the icon names it uses (quoted PascalCase strings that are Lucide icons), the
 * names it registers, and any registration it cannot read.
 * Returns `{used: {name, line}[], registered: string[], unreadable: {line}[]}`.
 */
export function scanIcons(file, text) {
  const code = masked(file, text);
  const used = [];
  for (const match of code.matchAll(QUOTED_PASCAL)) {
    if (CATALOG.has(match[2])) used.push({name: match[2], offset: match.index});
  }
  const registered = [];
  const unreadable = [];
  if (extname(file).toLowerCase() !== '.html') {
    for (const call of code.matchAll(REGISTRATION)) {
      if (/\bfunction\s+$/.test(code.slice(0, call.index))) continue;
      const open = call.index + call[0].length - 1;
      const argument = balanced(code, open);
      const read = argument === null ? {unreadable: true, names: []} : registeredNames(argument);
      registered.push(...read.names);
      if (read.unreadable) unreadable.push({line: lineAt(code, call.index)});
    }
  }
  return {
    used: used.map(({name, offset}) => ({name, line: lineAt(code, offset)})),
    registered,
    unreadable,
  };
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
 * skipped) as one app. Returns `{files, findings}`, each finding `{file, line, rule, message}`.
 */
export function checkIcons(paths, {cwd = process.cwd()} = {}) {
  const scanned = [];
  for (const path of paths) {
    for (const file of walk(path)) {
      const shown = relative(cwd, file).split(sep).join('/');
      scanned.push({shown, ...scanIcons(shown, readFileSync(file, 'utf8'))});
    }
  }
  const registered = new Set(scanned.flatMap(file => file.registered));
  const findings = [];
  for (const {shown, used, unreadable} of scanned) {
    for (const {line} of unreadable) {
      findings.push({
        file: shown,
        line,
        rule: 'registration',
        message:
          'this icon registration is not an object literal of plain keys (no spread, no computed key), so the icons it registers cannot be checked: list them in the call',
      });
    }
    const seen = new Set();
    for (const {name, line} of used) {
      if (ICON_SUBSET.has(name) || registered.has(name) || seen.has(`${name}|${line}`)) continue;
      seen.add(`${name}|${line}`);
      findings.push({
        file: shown,
        line,
        rule: 'missing-icon',
        message: `"${name}" is a Lucide icon outside the <cmn-icon> subset and this app's provideLucideIcons registrations, so it renders empty: register it with provideLucideIcons({${name}}), or add it to scripts/icon-set/consumers.json in lifekit-common`,
      });
    }
  }
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  return {files: scanned.length, findings};
}
