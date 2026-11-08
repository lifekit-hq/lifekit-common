import {type Nullable} from '../../types';
import {type WhatsNewStorage} from './whats-new.config';

/**
 * The per-device "last seen" version. Storage can be blocked (a private window, cleared site data),
 * so every access is guarded: a failed read is "nothing seen yet", a failed write is a badge that
 * can come back on the next visit and nothing else.
 */
export class WhatsNewSeen {
  constructor(
    private readonly storage: Nullable<WhatsNewStorage>,
    private readonly key: string
  ) {}

  /** The version recorded on this device; null when none, or when storage is unavailable. */
  public read(): Nullable<string> {
    try {
      return this.storage?.getItem(this.key) ?? null;
    } catch {
      return null;
    }
  }

  public write(version: string): void {
    try {
      this.storage?.setItem(this.key, version);
    } catch {
      // Storage blocked: nothing depends on the marker being kept.
    }
  }
}

/** `localStorage`, or null where merely touching it throws. */
export function defaultStorage(): Nullable<WhatsNewStorage> {
  try {
    return localStorage;
  } catch {
    return null;
  }
}
