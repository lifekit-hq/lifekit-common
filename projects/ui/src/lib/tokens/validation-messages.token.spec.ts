import {TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {
  DEFAULT_VALIDATION_MESSAGES,
  VALIDATION_MESSAGES,
  type ValidationMessageFn,
} from './validation-messages.token';

describe('VALIDATION_MESSAGES', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('falls back to the built-in map when an app provides none', () => {
    TestBed.configureTestingModule({});
    expect(TestBed.inject(VALIDATION_MESSAGES)).toBe(DEFAULT_VALIDATION_MESSAGES);
  });

  it('takes an app-supplied map when one is provided', () => {
    const custom: Record<string, ValidationMessageFn> = {required: () => 'Bitte ausfüllen.'};
    TestBed.configureTestingModule({
      providers: [{provide: VALIDATION_MESSAGES, useValue: custom}],
    });
    expect(TestBed.inject(VALIDATION_MESSAGES)).toBe(custom);
  });
});

describe('DEFAULT_VALIDATION_MESSAGES', () => {
  it.each<[string, string]>([
    ['required', 'This field is required.'],
    ['email', 'Enter a valid email address.'],
    ['pattern', 'Format is invalid.'],
    ['passwordsMismatch', 'Passwords do not match.'],
  ])('renders the parameter-less message for "%s"', (key, expected) => {
    expect(DEFAULT_VALIDATION_MESSAGES[key]()).toBe(expected);
  });

  it.each<[string, string]>([
    ['minlength', 'Minimum 8 characters.'],
    ['maxlength', 'Maximum 8 characters.'],
  ])('interpolates requiredLength into the "%s" message', (key, expected) => {
    expect(DEFAULT_VALIDATION_MESSAGES[key]({requiredLength: 8})).toBe(expected);
  });

  it('has no entry for an unknown error key, so the caller can fall back', () => {
    expect(DEFAULT_VALIDATION_MESSAGES['notAValidator']).toBeUndefined();
  });
});
