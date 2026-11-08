/** One plain-language line of a release; an owner line is hidden from members. */
export interface WhatsNewNote {
  text: string;
  /** Written for the owner only: `cmn-whats-new` leaves it out unless the app says the person is one. */
  owner: boolean;
}

/** One release in the sheet. */
export interface WhatsNewVersion {
  /** `x.y.z`. */
  version: string;
  /** ISO date (`2026-10-05`); null when the release has none. */
  date: string | null;
  /** The plain lines written for this release, from the app's notes file. */
  notes: WhatsNewNote[];
  /** Every filtered change of this release, as sentences; folded under the notes. */
  changes: string[];
}

/** The shape of `whats-new.json`, written by `lifekit-whats-new` (docs/WHATS-NEW.md). */
export interface WhatsNewData {
  versions: WhatsNewVersion[];
}
