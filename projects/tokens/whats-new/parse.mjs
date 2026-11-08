// Pure parsing for `lifekit-whats-new`: no file access, so a node:test spec can feed it text.
// A notes file (one `## x.y.z` heading per release, plain bullets under it) and, optionally, a
// release-please CHANGELOG.md become the `whats-new.json` that `cmn-whats-new` reads.

// The release-please sections the "Every change" fold lists; every other section is dropped.
const KEPT_SECTIONS = new Set(['Features', 'Bug Fixes']);

// Scopes that name plumbing a person using the app never sees. An entry is dropped when every scope
// it lists is internal; a spec number ("040") is internal too. An app adds its own with `internalScopes`.
export const INTERNAL_SCOPES = [
  'ci',
  'docker',
  'deploy',
  'mcp',
  'api',
  'migrations',
  'e2e',
  'qa',
  'observability',
  'backend',
  'gateway',
  'ops',
  'deps',
  'tooling',
  'auth',
  'companion',
  'agent',
  'analytics',
];
const SPEC_NUMBER = /^\d+$/;

// Wording that marks a developer-facing entry whatever its scope.
const INTERNAL_TERMS = [
  /query filter/i,
  /rate-?limit/i,
  /\btokens?\b/i,
  /\bmigrations?\b/i,
  /\btests?\b/i,
  /shadow mode/i,
];

/** How many releases the sheet lists; older ones fall off. */
export const MAX_VERSIONS = 6;
const OWNER_TAG = /^\(owner\)\s*|\s*\(owner\)$/i;

const VERSION_HEADING =
  /^## \[?(\d+\.\d+\.\d+)\]?(?:\([^)]*\))?\s*(?:\((\d{4}-\d{2}-\d{2})\))?\s*$/;
const NOTES_HEADING = /^## \[?(\d+\.\d+\.\d+)\]?\s*$/;
const ENTRY = /^\* (?:\*\*([^*]+?):\*\* )?(.+)$/;
const ISSUE_LINK = /\s*\(\[#\d+\]\([^)]*\)\)/g;
const HASH_LINK = /\s*\(\[[0-9a-f]{7,40}\]\([^)]*\)\)/g;
// Issue references left once links are reduced to text: "(#419 S3)", "(#695)", ", closes #704".
const BARE_ISSUE = /\s*\(#\d+[^)]*\)|,?\s*\b(?:closes|fixes|resolves)\s+#\d+/gi;
const MARKDOWN_LINK = /\[([^\]]+)\]\([^)]*\)/g;
const ENTITIES = {'&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&amp;': '&'};

function decodeEntities(text) {
  return text.replace(/&(?:lt|gt|quot|#39|amp);/g, entity => ENTITIES[entity]);
}

function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The entry's subject with issue links, commit hashes and markdown links reduced to plain text. */
export function cleanSubject(raw) {
  const text = raw
    .replace(ISSUE_LINK, '')
    .replace(HASH_LINK, '')
    .replace(MARKDOWN_LINK, '$1')
    .replace(BARE_ISSUE, '');
  return capitalise(decodeEntities(text).trim());
}

/** Whether a changelog entry (scope text may be undefined) is one a person using the app would read. */
export function isUserFacing(scope, subject, internalScopes = INTERNAL_SCOPES) {
  if (scope !== undefined) {
    const internal = new Set(internalScopes);
    const scopes = scope.split(',').map(part => part.trim().toLowerCase());
    if (scopes.every(part => internal.has(part) || SPEC_NUMBER.test(part))) {
      return false;
    }
  }
  return !INTERNAL_TERMS.some(term => term.test(subject));
}

/**
 * CHANGELOG.md to `[{version, date, changes}]`, newest first, at most `MAX_VERSIONS`. `changes` are the
 * kept Features and Bug Fixes entries as plain sentences; a version with none gets an empty list.
 */
export function parseChangelog(text, {internalScopes = INTERNAL_SCOPES} = {}) {
  const versions = [];
  let current = null;
  let sectionKept = false;
  for (const line of text.split(/\r?\n/)) {
    const heading = VERSION_HEADING.exec(line);
    if (heading) {
      current = {version: heading[1], date: heading[2] ?? null, changes: []};
      versions.push(current);
      sectionKept = false;
    } else if (line.startsWith('### ')) {
      sectionKept = KEPT_SECTIONS.has(line.slice(4).trim());
    } else if (current !== null && sectionKept) {
      const entry = ENTRY.exec(line);
      if (entry) {
        const subject = cleanSubject(entry[2]);
        if (subject !== '' && isUserFacing(entry[1], subject, internalScopes)) {
          current.changes.push(subject);
        }
      }
    }
  }
  return versions.slice(0, MAX_VERSIONS);
}

/**
 * notes.md to a map of version to `[{text, owner}]`, in file order. A `## 1.15.0` heading opens a
 * version and each `- ` bullet under it is one line; `(owner)` at either end of a bullet marks a
 * line for the owner only. Anything else (the file's comment, prose, other headings) is ignored.
 */
export function parseNotes(text) {
  const notes = new Map();
  let lines = null;
  for (const raw of text.split(/\r?\n/)) {
    const heading = NOTES_HEADING.exec(raw);
    if (heading) {
      lines = [];
      notes.set(heading[1], lines);
    } else if (raw.startsWith('## ')) {
      lines = null;
    } else if (lines !== null && raw.startsWith('- ')) {
      const body = raw.slice(2).trim();
      const owner = OWNER_TAG.test(body);
      const line = body.replace(OWNER_TAG, '').trim();
      if (line !== '') {
        lines.push({text: line, owner});
      }
    }
  }
  return notes;
}

/**
 * The sheet's JSON. With a changelog, each release in it (newest first) carries the plain notes
 * written for it and its filtered change list. Without one, the releases are the notes file's own
 * headings, in file order, with no date and no change list.
 */
export function buildWhatsNew(notesText, changelogText = null, options = {}) {
  const noteMap = parseNotes(notesText);
  if (changelogText === null) {
    return {
      versions: [...noteMap]
        .slice(0, MAX_VERSIONS)
        .map(([version, notes]) => ({version, date: null, notes, changes: []})),
    };
  }
  return {
    versions: parseChangelog(changelogText, options).map(version => ({
      ...version,
      notes: noteMap.get(version.version) ?? [],
    })),
  };
}
