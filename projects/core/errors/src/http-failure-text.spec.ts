import {HttpErrorResponse} from '@angular/common/http';

import {httpFailureText, statusOf} from './http-failure-text';

const options = {unreachable: 'Offline', fallback: 'Something went wrong'};
const failure = (error: unknown, status = 400): HttpErrorResponse =>
  new HttpErrorResponse({error, status});

describe('statusOf', () => {
  it('reads the status of an HttpErrorResponse, including 0', () => {
    expect(statusOf(failure(null, 503))).toBe(503);
    expect(statusOf(failure(null, 0))).toBe(0);
  });

  it('reads a numeric status off a plain object', () => {
    expect(statusOf({status: 404})).toBe(404);
  });

  it('returns null for non-HTTP errors', () => {
    expect(statusOf(new Error('boom'))).toBeNull();
    expect(statusOf({status: '404'})).toBeNull();
    expect(statusOf(undefined)).toBeNull();
  });
});

describe('httpFailureText', () => {
  it('reads `detail`', () => {
    expect(httpFailureText(failure({detail: 'Name taken'}), options)).toBe('Name taken');
  });

  it('joins an `errors` array', () => {
    expect(httpFailureText(failure({errors: ['Too short.', 'Needs a digit.']}), options)).toBe(
      'Too short. Needs a digit.'
    );
  });

  it('flattens a field-keyed `errors` object', () => {
    expect(httpFailureText(failure({errors: {name: ['Required'], age: 'Too low'}}), options)).toBe(
      'Required Too low'
    );
  });

  it('reads `error`', () => {
    expect(httpFailureText(failure({error: 'Forbidden'}, 403), options)).toBe('Forbidden');
  });

  it('falls back when the body has no sentence', () => {
    expect(httpFailureText(failure({detail: '  '}, 500), options)).toBe(options.fallback);
    expect(httpFailureText(failure('<html>', 502), options)).toBe(options.fallback);
    expect(httpFailureText(failure(null, 500), options)).toBe(options.fallback);
  });

  it('answers unreachable for status 0', () => {
    expect(httpFailureText(failure(null, 0), options)).toBe(options.unreachable);
  });

  it('answers the fallback for a non-HTTP error', () => {
    expect(httpFailureText(new Error('boom'), options)).toBe(options.fallback);
  });

  it('uses custom readers instead of the built-ins', () => {
    const readers = [(body: unknown) => (body as {msg?: string}).msg ?? null];
    expect(
      httpFailureText(failure({msg: 'Custom', detail: 'Ignored'}), {...options, readers})
    ).toBe('Custom');
  });
});
