import {InjectionToken, type Provider} from '@angular/core';

import {type WhatsNewData} from './whats-new.model';

/** Where `lifekit-whats-new` writes the file by default, served from the app's `public/`. */
export const WHATS_NEW_DEFAULT_URL = '/whats-new.json';

/** The `localStorage` key that holds the version this device last opened the sheet for. */
export const WHATS_NEW_DEFAULT_STORAGE_KEY = 'lifekit.whatsNew.lastSeen';

/** The label of the menu item, the sheet's title and the version footer. */
export const WHATS_NEW_LABEL = "What's new";

/** What the seen marker needs of a store: `localStorage`, or an in-memory stand-in. */
export type WhatsNewStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface WhatsNewConfig {
  /** The version the app is running, `x.y.z`: the one the badge asks whether this device has seen. */
  version: string;
  /** Where the built notes are fetched from when the sheet opens. Defaults to `/whats-new.json`. */
  url?: string;
  /** Replaces the fetch of `url`; stories and tests hand their data in here. */
  load?: () => Promise<WhatsNewData>;
  /** Key of the seen marker in `storage`; give each app its own. */
  storageKey?: string;
  /** Where the seen marker lives. Defaults to `localStorage`, guarded: a blocked store just shows the badge again. */
  storage?: WhatsNewStorage;
  /**
   * Whether this person may read the owner's notes. It is read reactively, so close over the
   * app's own role signal: `() => auth.isOwner()`. Omitted, owner notes are always hidden.
   */
  includeOwnerNotes?: () => boolean;
}

export const CMN_WHATS_NEW_CONFIG = new InjectionToken<WhatsNewConfig>('CmnWhatsNewConfig');

/** Gives the app's What's new its running version and where its notes are. Add it once, in the app's providers. */
export function provideWhatsNew(config: WhatsNewConfig): Provider {
  return {provide: CMN_WHATS_NEW_CONFIG, useValue: config};
}
