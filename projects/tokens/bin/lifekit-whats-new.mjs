#!/usr/bin/env node
/**
 * Builds an app's `whats-new.json` from its notes file (and, optionally, its release-please
 * CHANGELOG.md). `cmn-whats-new` in `@lifekit-hq/ui` fetches that file when the sheet opens.
 * `--check` writes nothing and exits 1 when the file on disk is not what the sources produce.
 *
 *   lifekit-whats-new                                   src/whats-new/notes.md -> public/whats-new.json
 *   lifekit-whats-new --changelog ../CHANGELOG.md       also list each release's filtered change list
 *   lifekit-whats-new --check                           exit 1 when public/whats-new.json is stale
 *   lifekit-whats-new --internal-scope billing          drop one more changelog scope from the list
 *
 * The notes format is in docs/WHATS-NEW.md.
 */
import {existsSync, mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {parseArgs} from 'node:util';

import {buildWhatsNew, INTERNAL_SCOPES} from '../whats-new/parse.mjs';

const DEFAULT_NOTES = 'src/whats-new/notes.md';
const DEFAULT_OUT = 'public/whats-new.json';

const USAGE =
  `usage: lifekit-whats-new [--notes ${DEFAULT_NOTES}] [--out ${DEFAULT_OUT}]\n` +
  '                         [--changelog <CHANGELOG.md>] [--internal-scope <scope>]… [--check]';

let parsed;
try {
  parsed = parseArgs({
    options: {
      notes: {type: 'string', default: DEFAULT_NOTES},
      out: {type: 'string', default: DEFAULT_OUT},
      changelog: {type: 'string'},
      'internal-scope': {type: 'string', multiple: true, default: []},
      check: {type: 'boolean', default: false},
      help: {type: 'boolean', short: 'h'},
    },
  });
} catch (error) {
  console.error(`${error.message}\n${USAGE}`);
  process.exit(2);
}

const {values} = parsed;
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}

if (values.changelog !== undefined && !existsSync(values.changelog)) {
  // A missing changelog is a broken copy or mount, not an app with no releases.
  console.error(`lifekit-whats-new: ${values.changelog} not found`);
  process.exit(2);
}

// A missing notes file is an app that has written none yet: the sheet then shows the change list only.
const notes = existsSync(values.notes) ? readFileSync(values.notes, 'utf8') : '';
const changelog = values.changelog === undefined ? null : readFileSync(values.changelog, 'utf8');
const data = buildWhatsNew(notes, changelog, {
  internalScopes: [...INTERNAL_SCOPES, ...values['internal-scope']],
});
const json = `${JSON.stringify(data, null, 2)}\n`;

if (values.check) {
  const current = existsSync(values.out) ? readFileSync(values.out, 'utf8') : null;
  if (current !== json) {
    console.error(`lifekit-whats-new: ${values.out} is out of date; run lifekit-whats-new`);
    process.exit(1);
  }
  console.log(`lifekit-whats-new: ${values.out} is up to date`);
  process.exit(0);
}

mkdirSync(dirname(values.out), {recursive: true});
// Replace by rename: it needs only write access to the folder, so a root-owned file left by a dev
// container on a bind mount cannot make a host-side build fail with EACCES.
const temp = `${values.out}.${process.pid}.tmp`;
writeFileSync(temp, json);
renameSync(temp, values.out);
console.log(`lifekit-whats-new: ${data.versions.length} versions -> ${values.out}`);
