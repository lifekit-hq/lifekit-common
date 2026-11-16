import {isDevMode} from '@angular/core';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const provideServiceWorker = vi.hoisted(() =>
  vi.fn<(script: string, options: object) => object>(() => ({}))
);
vi.mock('@angular/service-worker', () => ({provideServiceWorker}));

import {provideLifekitServiceWorker} from './provide-lifekit-service-worker';

describe('provideLifekitServiceWorker', () => {
  beforeEach(() => {
    provideServiceWorker.mockClear();
  });

  it('registers ngsw-worker.js after the app is stable, bypassing the HTTP cache', () => {
    provideLifekitServiceWorker();

    expect(provideServiceWorker).toHaveBeenCalledWith('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
      updateViaCache: 'none',
    });
  });

  it('takes a custom script, e.g. a push-aware wrapper', () => {
    provideLifekitServiceWorker({script: 'sw.js'});

    expect(provideServiceWorker.mock.calls[0]?.[0]).toBe('sw.js');
  });

  it.each([true, false])('lets the app force enabled=%s', enabled => {
    provideLifekitServiceWorker({enabled});

    expect(provideServiceWorker.mock.calls[0]?.[1]).toMatchObject({enabled});
  });
});
