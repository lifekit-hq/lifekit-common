import {describe, expect, it, vi} from 'vitest';

import {defaultStorage, WhatsNewSeen} from './whats-new-seen';

describe('WhatsNewSeen', () => {
  it('reads nothing, and writes nothing, without a store', () => {
    const seen = new WhatsNewSeen(null, 'key');

    seen.write('1.0.0');

    expect(seen.read()).toBeNull();
  });

  it('round-trips the version through the store under its key', () => {
    const items = new Map<string, string>();
    const seen = new WhatsNewSeen(
      {getItem: key => items.get(key) ?? null, setItem: (key, value) => void items.set(key, value)},
      'app.seen'
    );

    seen.write('2.1.0');

    expect(items.get('app.seen')).toBe('2.1.0');
    expect(seen.read()).toBe('2.1.0');
  });
});

describe('defaultStorage', () => {
  it('is localStorage', () => {
    expect(defaultStorage()).toBe(localStorage);
  });

  it('is null where touching localStorage throws', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      expect(defaultStorage()).toBeNull();
    } finally {
      vi.restoreAllMocks();
    }
  });
});
