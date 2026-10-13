import {TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {LOCAL_STORAGE} from './local-storage.token';
import {PREFERENCE_SAVE_ERROR_HANDLER} from './preference-error-handler.token';

describe('preference tokens', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('defaults LOCAL_STORAGE to the browser localStorage', () => {
    expect(TestBed.inject(LOCAL_STORAGE)).toBe(localStorage);
  });

  it('defaults the save error handler to a no-op', () => {
    const handler = TestBed.inject(PREFERENCE_SAVE_ERROR_HANDLER);
    expect(
      handler({error: new Error('x'), errorCode: null, fields: ['appearance']})
    ).toBeUndefined();
  });
});
