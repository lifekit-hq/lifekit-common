import {TestBed} from '@angular/core/testing';
import {
  icons,
  LUCIDE_ICONS,
  LucideIconProvider,
  type LucideIconProviderInterface,
  type LucideIcons,
} from 'lucide-angular';
import {beforeEach, describe, expect, it} from 'vitest';

import {provideLucideIcons} from './provide-lucide-icons';

/**
 * `LUCIDE_ICONS` is declared as a single provider but registered `multi`, so the
 * injected value is really an array.
 */
function registered(): LucideIconProviderInterface[] {
  return TestBed.inject(LUCIDE_ICONS) as unknown as LucideIconProviderInterface[];
}

/** Lucide icon names are PascalCase; build the map by key rather than as a literal. */
function iconMap(...names: (keyof typeof icons)[]): LucideIcons {
  const map: LucideIcons = {};
  for (const name of names) {
    map[name] = icons[name];
  }
  return map;
}

describe('provideLucideIcons', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('registers a LucideIconProvider over the supplied map', () => {
    TestBed.configureTestingModule({providers: [provideLucideIcons(iconMap('Bell'))]});

    const providers = registered();
    expect(providers).toHaveLength(1);
    expect(providers[0]).toBeInstanceOf(LucideIconProvider);
  });

  it('resolves an icon from the supplied map', () => {
    TestBed.configureTestingModule({providers: [provideLucideIcons(iconMap('Bell'))]});

    const [provider] = registered();
    expect(provider.getIcon('Bell')).toBeTruthy();
  });

  it('is multi, so several calls stack instead of replacing each other', () => {
    TestBed.configureTestingModule({
      providers: [provideLucideIcons(iconMap('Bell')), provideLucideIcons(iconMap('X'))],
    });

    expect(registered()).toHaveLength(2);
  });
});
