import {TestBed} from '@angular/core/testing';
import {describe, expect, it} from 'vitest';

import {ERROR_MESSAGES, type ErrorMessagesMap} from './error-messages.token';

describe('ERROR_MESSAGES', () => {
  it('provides an empty map by default so injection never fails', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    expect(TestBed.inject(ERROR_MESSAGES)).toEqual({});
  });

  it('takes the app-supplied map when one is provided', () => {
    const messages: ErrorMessagesMap = {};
    messages['rate_limited'] = 'Too many attempts. Try again later.';
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{provide: ERROR_MESSAGES, useValue: messages}],
    });
    expect(TestBed.inject(ERROR_MESSAGES)).toBe(messages);
  });
});
