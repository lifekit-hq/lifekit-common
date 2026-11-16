import {isDevMode} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {SwRegistrationOptions} from '@angular/service-worker';
import {describe, expect, it} from 'vitest';

import {provideLifekitServiceWorker} from './provide-lifekit-service-worker';

describe('provideLifekitServiceWorker', () => {
  function options(...args: Parameters<typeof provideLifekitServiceWorker>): SwRegistrationOptions {
    TestBed.configureTestingModule({providers: [provideLifekitServiceWorker(...args)]});
    return TestBed.inject(SwRegistrationOptions);
  }

  it('registers after the app is stable, bypassing the HTTP cache, off in dev', () => {
    expect(options()).toMatchObject({
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
      updateViaCache: 'none',
    });
  });

  it.each([true, false])('lets the app force enabled=%s', enabled => {
    expect(options({enabled}).enabled).toBe(enabled);
  });

  it('accepts a custom script without changing the registration options', () => {
    expect(options({script: 'sw.js'})).toMatchObject({
      registrationStrategy: 'registerWhenStable:30000',
      updateViaCache: 'none',
    });
  });
});
