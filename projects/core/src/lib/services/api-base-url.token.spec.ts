import {TestBed} from '@angular/core/testing';
import {describe, expect, it} from 'vitest';

import {API_BASE_URL, provideApiBaseUrl} from './api-base-url.token';

describe('provideApiBaseUrl', () => {
  it('binds the supplied url to API_BASE_URL', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({providers: [provideApiBaseUrl('/api/v1')]});
    expect(TestBed.inject(API_BASE_URL)).toBe('/api/v1');
  });

  it('has no default — an app that forgets to provide it fails loudly', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    expect(() => TestBed.inject(API_BASE_URL)).toThrow();
  });
});
