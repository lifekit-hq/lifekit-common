#!/usr/bin/env node
/**
 * The before/after report for a pull request that changes screen baselines
 * (docs/SCREEN-BASELINES.md). Compares the Linux baseline images between two commits and prints a
 * Markdown comment with each changed screen's image on the base and on the head, so a change to
 * the look is never silent. Prints nothing when no baseline changed.
 *
 *   node baseline-report.mjs --repo lifekit-hq/lifekit-common --base <sha> --head <sha>
 *
 * Images are linked, not uploaded: `github.com/<repo>/blob/<sha>/<path>?raw=true` resolves for
 * anyone who can read the repository, from the commit that holds the image.
 */
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

/** Identifies the comment, so a later push edits it instead of adding another. */
export const MARKER = '<!-- screen-baseline-report -->';

/**
 * A Linux baseline: Playwright writes `<name>-<project>-linux.png` (`screenBaselineConfig` puts them
 * in one `baselines` folder under the app's test directory, wherever that is).
 */
const BASELINE = /(?:^|\/)[^/]+-linux\.png$/;
const PHONE_WIDTH = 195;
const DESKTOP_WIDTH = 400;
/** A comment holds 65,536 characters; a row is a few hundred, so this keeps well inside it. */
export const MAX_ROWS = 40;

const STATUS = {A: 'added', M: 'changed', D: 'removed'};

/** Parses `git diff --name-status` output into the baseline changes it lists. */
export function parseChanges(nameStatus) {
  return nameStatus
    .split('\n')
    .map(line => line.split('\t'))
    .filter(([status, path]) => path && STATUS[status] && BASELINE.test(path))
    .map(([status, path]) => ({status: STATUS[status], path}))
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** `templates-list-phone-light` out of `.../templates-list-phone-light-chromium-linux.png`. */
export function screenName(path) {
  return path
    .split('/')
    .pop()
    .replace(/-[^-]+-linux\.png$/, '');
}

function image({repo, sha, path, alt, width}) {
  const url = `https://github.com/${repo}/blob/${sha}/${encodeURI(path)}?raw=true`;
  return `<img src="${url}" alt="${alt}" width="${width}">`;
}

/** The comment body for a set of changes; empty when there are none. */
export function renderReport({repo, base, head, changes}) {
  if (changes.length === 0) return '';
  const shown = changes.slice(0, MAX_ROWS);
  const count = status => changes.filter(change => change.status === status).length;
  const rows = shown.map(({status, path}) => {
    const name = screenName(path);
    const width = name.includes('-phone-') ? PHONE_WIDTH : DESKTOP_WIDTH;
    const before =
      status === 'added'
        ? '_new screen_'
        : image({repo, sha: base, path, alt: `${name} before`, width});
    const after =
      status === 'removed'
        ? '_removed_'
        : image({repo, sha: head, path, alt: `${name} after`, width});
    return `| \`${name}\` (${status}) | ${before} | ${after} |`;
  });
  const lines = [
    MARKER,
    '### Screen baselines changed',
    '',
    `${count('changed')} changed, ${count('added')} added, ${count('removed')} removed. ` +
      'This pull request changes how screens look; the images below are the screens before (base) ' +
      'and after (this branch). A new baseline is the first one for its screen and needs the ' +
      "owner's approval; a changed one needs the change to be intended.",
    '',
    '| Screen | Before | After |',
    '| --- | --- | --- |',
    ...rows,
  ];
  if (changes.length > shown.length) {
    lines.push('', `…and ${changes.length - shown.length} more: see the Files changed tab.`);
  }
  return `${lines.join('\n')}\n`;
}

function arg(name) {
  const at = process.argv.indexOf(`--${name}`);
  const value = at === -1 ? undefined : process.argv[at + 1];
  if (!value) {
    console.error(`usage: baseline-report.mjs --repo <owner/name> --base <sha> --head <sha>`);
    process.exit(2);
  }
  return value;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [repo, base, head] = ['repo', 'base', 'head'].map(arg);
  const diff = execFileSync('git', ['diff', '--name-status', '--no-renames', base, head], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  process.stdout.write(renderReport({repo, base, head, changes: parseChanges(diff)}));
}
