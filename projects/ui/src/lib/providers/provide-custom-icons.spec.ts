import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {firstValueFrom} from 'rxjs';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {CmnIconRegistry} from '../services/icon-registry/icon-registry.service';
import {type CustomIconsConfig, provideCustomIcons} from './provide-custom-icons';

const SVG = '<svg viewBox="0 0 16 16"><rect width="16" height="16" /></svg>';

function setup(config: CustomIconsConfig): CmnIconRegistry {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideCustomIcons(config)],
  });
  // The registration runs in an app initializer, so force one.
  return TestBed.inject(CmnIconRegistry);
}

describe('provideCustomIcons', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    http?.verify();
  });

  it('registers inline SVGs so the registry resolves them without HTTP', async () => {
    const registry = setup({inline: {'brand-mark': SVG}});
    http = TestBed.inject(HttpTestingController);

    expect(registry.has('brand-mark')).toBe(true);
    expect(await firstValueFrom(registry.resolve('brand-mark'))).toBeTruthy();
  });

  it('registers URLs so the registry fetches them on first resolve', async () => {
    const registry = setup({urls: {remote: '/assets/remote.svg'}});
    http = TestBed.inject(HttpTestingController);

    expect(registry.has('remote')).toBe(true);
    const pending = firstValueFrom(registry.resolve('remote'));
    http.expectOne('/assets/remote.svg').flush(SVG);
    expect(await pending).toBeTruthy();
  });

  it('registers both kinds in one call', () => {
    const registry = setup({inline: {'brand-mark': SVG}, urls: {remote: '/assets/remote.svg'}});
    http = TestBed.inject(HttpTestingController);

    expect(registry.has('brand-mark')).toBe(true);
    expect(registry.has('remote')).toBe(true);
  });

  it('registers nothing for an empty config', () => {
    const registry = setup({});
    http = TestBed.inject(HttpTestingController);

    expect(registry.has('brand-mark')).toBe(false);
  });
});
