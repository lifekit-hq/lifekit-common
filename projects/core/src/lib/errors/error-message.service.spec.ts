import {TestBed} from '@angular/core/testing';
import {describe, expect, it} from 'vitest';

import {ErrorMessageService} from './error-message.service';
import {ERROR_MESSAGES, type ErrorMessagesMap} from './error-messages.token';

/** Error codes are snake_case on the wire; build the map by key to keep the linter happy. */
function messageMap(code: string, message: string): ErrorMessagesMap {
  const map: ErrorMessagesMap = {};
  map[code] = message;
  return map;
}

function build(messages?: ErrorMessagesMap): ErrorMessageService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: messages ? [{provide: ERROR_MESSAGES, useValue: messages}] : [],
  });
  return TestBed.inject(ErrorMessageService);
}

describe('ErrorMessageService', () => {
  it('resolves a known code to its message', () => {
    const service = build(messageMap('invalid_credentials', 'Email or password is incorrect.'));
    expect(service.resolve('invalid_credentials')).toBe('Email or password is incorrect.');
  });

  it('returns null for an unknown code so the caller can fall back', () => {
    const service = build(messageMap('invalid_credentials', 'Email or password is incorrect.'));
    expect(service.resolve('never_seen')).toBeNull();
  });

  it.each<[string, string | null | undefined]>([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
  ])('returns null for %s', (_label, code) => {
    expect(build({}).resolve(code)).toBeNull();
  });

  it('defaults to an empty map when the app provides none', () => {
    expect(build().resolve('anything')).toBeNull();
  });
});
