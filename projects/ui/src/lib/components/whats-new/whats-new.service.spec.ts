import {TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {CmnDrawerService} from '../../services/drawer/drawer.service';
import {provideWhatsNew, type WhatsNewConfig, type WhatsNewStorage} from './whats-new.config';
import {WHATS_NEW_FIXTURE} from './whats-new.fixtures';
import {type WhatsNewData} from './whats-new.model';
import {CmnWhatsNewService} from './whats-new.service';

const KEY = 'test.whatsNew.lastSeen';

function memoryStorage(initial: Record<string, string> = {}): WhatsNewStorage & {
  items: Record<string, string>;
} {
  const items = {...initial};
  return {
    items,
    getItem: key => items[key] ?? null,
    setItem: (key, value) => {
      items[key] = value;
    },
  };
}

describe('CmnWhatsNewService', () => {
  let drawerOpen: ReturnType<typeof vi.fn>;
  let load: ReturnType<typeof vi.fn<() => Promise<WhatsNewData>>>;

  beforeEach(() => {
    drawerOpen = vi.fn(() => ({}));
    load = vi.fn(() => Promise.resolve(WHATS_NEW_FIXTURE));
  });

  function create(config: Partial<WhatsNewConfig> = {}): CmnWhatsNewService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWhatsNew({version: '4.5.0', storageKey: KEY, load, ...config}),
        {provide: CmnDrawerService, useValue: {open: drawerOpen}},
      ],
    });
    return TestBed.inject(CmnWhatsNewService);
  }

  describe('the seen marker', () => {
    it('counts the first run on a device as seen: no badge, and nothing fetched', () => {
      const storage = memoryStorage();
      const service = create({storage});

      expect(storage.items[KEY]).toBe('4.5.0');
      expect(service.hasUnread()).toBe(false);
      expect(load).not.toHaveBeenCalled();
    });

    it('raises the badge once an older marker meets a release that has lines, and fetches to know', async () => {
      const service = create({storage: memoryStorage({[KEY]: '4.4.2'})});
      expect(service.hasUnread()).toBe(false);

      await service.load();

      expect(load).toHaveBeenCalledTimes(1);
      expect(service.hasUnread()).toBe(true);
    });

    it('shows no badge for a release without lines', async () => {
      const service = create({
        version: '4.4.0',
        storage: memoryStorage({[KEY]: '4.3.0'}),
      });

      await service.load();

      expect(service.hasUnread()).toBe(false);
    });

    it('shows no badge when the marker is current, or newer than the app (a rollback)', () => {
      expect(create({storage: memoryStorage({[KEY]: '4.5.0'})}).hasUnread()).toBe(false);
      expect(create({storage: memoryStorage({[KEY]: '9.0.0'})}).hasUnread()).toBe(false);
      expect(load).not.toHaveBeenCalled();
    });

    it('clears the badge and records the running version when the sheet opens', async () => {
      const storage = memoryStorage({[KEY]: '4.4.2'});
      const service = create({storage});
      await service.load();

      service.open();

      expect(service.hasUnread()).toBe(false);
      expect(storage.items[KEY]).toBe('4.5.0');
    });

    it('keeps working when storage throws', () => {
      const blocked: WhatsNewStorage = {
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => {
          throw new Error('blocked');
        },
      };
      const service = create({storage: blocked});

      expect(service.hasUnread()).toBe(false);
      expect(() => service.open()).not.toThrow();
    });
  });

  describe('owner lines', () => {
    it('leaves them out unless the app says the person is the owner', async () => {
      const service = create({storage: memoryStorage({[KEY]: '4.4.2'})});
      await service.load();

      expect(service.versions()[0].notes.map(note => note.owner)).toEqual([false, false]);
    });

    it('lists them for an owner, and follows the role as it changes', async () => {
      const owner = vi.fn(() => true);
      const service = create({
        storage: memoryStorage({[KEY]: '4.4.2'}),
        includeOwnerNotes: owner,
      });
      await service.load();

      expect(service.versions()[0].notes).toHaveLength(3);
    });

    it('shows the badge to a member only for a release with a line they can read', async () => {
      load.mockResolvedValue({
        versions: [
          {
            version: '4.5.0',
            date: null,
            notes: [{text: 'Only for the owner.', owner: true}],
            changes: [],
          },
        ],
      });
      const service = create({storage: memoryStorage({[KEY]: '4.4.2'})});
      await service.load();

      expect(service.hasUnread()).toBe(false);
    });
  });

  describe('loading', () => {
    it('is idle until asked, then loading, then success', async () => {
      const service = create({storage: memoryStorage({[KEY]: '4.5.0'})});
      expect(service.status()).toBe('idle');

      const pending = service.load();
      expect(service.status()).toBe('loading');
      await pending;

      expect(service.status()).toBe('success');
    });

    it('shares one fetch between callers and never fetches twice once it has the notes', async () => {
      const service = create({storage: memoryStorage({[KEY]: '4.5.0'})});

      await Promise.all([service.load(), service.load()]);
      await service.load();

      expect(load).toHaveBeenCalledTimes(1);
    });

    it('reports an error, and a retry asks again', async () => {
      load.mockRejectedValueOnce(new Error('offline'));
      const service = create({storage: memoryStorage({[KEY]: '4.5.0'})});

      await service.load();
      expect(service.status()).toBe('error');

      await service.load();
      expect(service.status()).toBe('success');
      expect(load).toHaveBeenCalledTimes(2);
    });

    it('fetches the configured url with the running version in the query', async () => {
      const fetchSpy = vi.fn(() =>
        Promise.resolve({ok: true, json: () => Promise.resolve(WHATS_NEW_FIXTURE)} as Response)
      );
      vi.stubGlobal('fetch', fetchSpy);
      try {
        const service = create({
          load: undefined,
          url: '/notes/whats-new.json',
          storage: memoryStorage({[KEY]: '4.5.0'}),
        });

        await service.load();

        expect(fetchSpy).toHaveBeenCalledWith('/notes/whats-new.json?v=4.5.0');
        expect(service.versions()).toHaveLength(4);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('treats a non-ok answer as an error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve({ok: false, status: 404} as Response))
      );
      try {
        const service = create({load: undefined, storage: memoryStorage({[KEY]: '4.5.0'})});

        await service.load();

        expect(service.status()).toBe('error');
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  describe('open', () => {
    it('opens the sheet as a drawer titled What’s new, with live signals, and starts the fetch', () => {
      const service = create({storage: memoryStorage({[KEY]: '4.5.0'})});

      service.open();

      const [, config] = drawerOpen.mock.calls[0];
      expect(config.title).toBe("What's new");
      expect(config.data.versions).toBe(service.versions);
      expect(config.data.status).toBe(service.status);
      expect(load).toHaveBeenCalledTimes(1);
    });

    it('lets the sheet retry', async () => {
      load.mockRejectedValueOnce(new Error('offline'));
      const service = create({storage: memoryStorage({[KEY]: '4.5.0'})});
      service.open();
      await service.load();

      drawerOpen.mock.calls[0][1].data.retry();
      await service.load();

      expect(load).toHaveBeenCalledTimes(2);
    });
  });

  it('labels the version footer with the running version', () => {
    expect(create({storage: memoryStorage()}).versionLabel).toBe("v4.5.0 · What's new");
  });
});
