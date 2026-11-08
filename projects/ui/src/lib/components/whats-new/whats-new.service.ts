import {computed, inject, Injectable, signal} from '@angular/core';

import {CmnDrawerService} from '../../services/drawer/drawer.service';
import {type Nullable} from '../../types';
import {type AsyncStateStatus} from '../async-state/async-state.component';
import {type CmnDrawerRef} from '../drawer/drawer-ref';
import {
  CMN_WHATS_NEW_CONFIG,
  WHATS_NEW_DEFAULT_STORAGE_KEY,
  WHATS_NEW_DEFAULT_URL,
  WHATS_NEW_LABEL,
} from './whats-new.config';
import {type WhatsNewData, type WhatsNewVersion} from './whats-new.model';
import {defaultStorage, WhatsNewSeen} from './whats-new-seen';
import {WhatsNewSheetComponent, type WhatsNewSheetData} from './whats-new-sheet.component';
import {isNewerVersion} from './whats-new-version.util';

const SIDE_PANEL_WIDTH = '480px';

/**
 * The one What's new of an app: which releases there are, whether this device has read the running
 * one, and the way into the sheet. The app gives it `provideWhatsNew({version})` and binds
 * `hasUnread` to a badge; the sheet's own body is `cmn-whats-new` (docs/WHATS-NEW.md).
 *
 * - The seen marker is `version` in `storage` under `storageKey`. The first run on a device counts
 *   as seen, so nobody is greeted with a badge on first sign-in; an older marker than the running
 *   version raises it (and fetches the notes, since the badge shows only for a release with notes).
 * - `open()` fetches the notes if they are not in yet, clears the badge, and opens the sheet: a
 *   side panel from md up and a bottom sheet below it, the drawer's own responsive rule.
 */
@Injectable({providedIn: 'root'})
export class CmnWhatsNewService {
  private readonly config = inject(CMN_WHATS_NEW_CONFIG);
  private readonly drawer = inject(CmnDrawerService);
  private readonly seen = new WhatsNewSeen(
    this.config.storage ?? defaultStorage(),
    this.config.storageKey ?? WHATS_NEW_DEFAULT_STORAGE_KEY
  );

  private readonly lastSeen = signal<Nullable<string>>(null);
  private readonly data = signal<Nullable<WhatsNewVersion[]>>(null);
  private readonly failed = signal(false);
  private readonly loading = signal(false);
  private request: Nullable<Promise<void>> = null;

  /** The running version, as the app gave it. */
  public readonly version = this.config.version;

  /** `v4.5.0 · What's new`: the sidebar footer's and the More page's caption. */
  public readonly versionLabel = `v${this.config.version} · ${WHATS_NEW_LABEL}`;

  /** The releases this person may read: an owner's line is left out unless `includeOwnerNotes` says so. */
  public readonly versions = computed<WhatsNewVersion[]>(() => {
    const includeOwner = this.config.includeOwnerNotes?.() ?? false;
    return (this.data() ?? []).map(release => ({
      ...release,
      notes: release.notes.filter(note => includeOwner || !note.owner),
    }));
  });

  /** The sheet's load state: the skeleton and the error only while nothing is in yet. */
  public readonly status = computed<AsyncStateStatus>(() => {
    if (this.data() !== null) {
      return 'success';
    }
    if (this.failed()) {
      return 'error';
    }
    return this.loading() ? 'loading' : 'idle';
  });

  /**
   * The running version is newer than the one this device last opened the sheet for, and it has
   * notes this person can read. A release with none shows no badge: there is nothing to read.
   */
  public readonly hasUnread = computed<boolean>(() => {
    const lastSeen = this.lastSeen();
    if (lastSeen === null || !isNewerVersion(this.version, lastSeen)) {
      return false;
    }
    const current = this.versions().find(release => release.version === this.version);
    return (current?.notes.length ?? 0) > 0;
  });

  constructor() {
    const stored = this.seen.read();
    if (stored === null) {
      this.seen.write(this.version);
      this.lastSeen.set(this.version);
      return;
    }
    this.lastSeen.set(stored);
    if (isNewerVersion(this.version, stored)) {
      void this.load();
    }
  }

  /** Fetches the notes once; a call while one is in flight shares it, and a call after a failure asks again. */
  public load(): Promise<void> {
    if (this.data() !== null) {
      return Promise.resolve();
    }
    this.request ??= this.run().finally(() => {
      this.request = null;
    });
    return this.request;
  }

  /** This device has now seen the running version: the badge clears. */
  public markSeen(): void {
    this.seen.write(this.version);
    this.lastSeen.set(this.version);
  }

  /** The way into the sheet from the account menu, the More page, the palette or the version footer. */
  public open(): CmnDrawerRef {
    void this.load();
    this.markSeen();
    const data: WhatsNewSheetData = {
      versions: this.versions,
      status: this.status,
      retry: () => void this.load(),
    };
    return this.drawer.open(WhatsNewSheetComponent, {
      title: WHATS_NEW_LABEL,
      width: SIDE_PANEL_WIDTH,
      data,
    });
  }

  private async run(): Promise<void> {
    this.loading.set(true);
    this.failed.set(false);
    try {
      this.data.set((await this.read()).versions);
    } catch {
      this.failed.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  private async read(): Promise<WhatsNewData> {
    if (this.config.load) {
      return this.config.load();
    }
    // The version in the query keeps a browser-cached copy from an older release out of the sheet.
    const url = `${this.config.url ?? WHATS_NEW_DEFAULT_URL}?v=${encodeURIComponent(this.version)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`What's new: ${url} answered ${response.status}`);
    }
    return (await response.json()) as WhatsNewData;
  }
}
