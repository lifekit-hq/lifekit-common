import {InjectionToken} from '@angular/core';

export type ValidationMessageFn = (params?: unknown) => string;

export const DEFAULT_VALIDATION_MESSAGES: Record<string, ValidationMessageFn> = {
  required: () => 'This field is required.',
  email: () => 'Enter an email address in the correct format, like name@example.com.',
  minlength: (p: unknown) =>
    `Enter at least ${(p as {requiredLength: number}).requiredLength} characters.`,
  maxlength: (p: unknown) =>
    `Enter ${(p as {requiredLength: number}).requiredLength} characters or fewer.`,
  pattern: () => 'Enter this in the correct format.',
  passwordsMismatch: () => 'Passwords do not match.',
};

export const VALIDATION_MESSAGES = new InjectionToken<Record<string, ValidationMessageFn>>(
  'VALIDATION_MESSAGES',
  {
    providedIn: 'root',
    factory: () => DEFAULT_VALIDATION_MESSAGES,
  }
);
