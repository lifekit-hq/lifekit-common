/** Types for @lifekit-hq/tokens/whats-new (the implementation is plain ES modules). */

/** One plain-language line of a release; an owner line is hidden from members. */
export interface WhatsNewNote {
  text: string;
  owner: boolean;
}

export interface WhatsNewVersion {
  version: string;
  /** ISO date (`2026-10-05`) from the changelog heading; null when there is none. */
  date: string | null;
  notes: WhatsNewNote[];
  /** The filtered changelog entries (features and fixes), as sentences. */
  changes: string[];
}

/** The shape of `whats-new.json`. */
export interface WhatsNewData {
  versions: WhatsNewVersion[];
}

export interface ParseChangelogOptions {
  /** Changelog scopes to drop; defaults to `INTERNAL_SCOPES`. */
  internalScopes?: readonly string[];
}

export const INTERNAL_SCOPES: readonly string[];
export const MAX_VERSIONS: number;
export function cleanSubject(raw: string): string;
export function isUserFacing(
  scope: string | undefined,
  subject: string,
  internalScopes?: readonly string[]
): boolean;
export function parseChangelog(
  text: string,
  options?: ParseChangelogOptions
): Omit<WhatsNewVersion, 'notes'>[];
export function parseNotes(text: string): Map<string, WhatsNewNote[]>;
export function buildWhatsNew(
  notesText: string,
  changelogText?: string | null,
  options?: ParseChangelogOptions
): WhatsNewData;
