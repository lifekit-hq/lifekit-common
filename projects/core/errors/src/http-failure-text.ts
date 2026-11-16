import {HttpErrorResponse} from '@angular/common/http';

/** Turns a parsed response body into a sentence, or `null` when it does not carry one. */
export type FailureBodyReader = (body: unknown) => string | null;

export interface HttpFailureTextOptions {
  /** Shown when the request never got a response (status 0: offline, CORS, DNS). */
  readonly unreachable: string;
  /** Shown when the error is not an HTTP failure or no reader finds a sentence. */
  readonly fallback: string;
  /** Replaces the built-in readers; tried in order, first sentence wins. */
  readonly readers?: readonly FailureBodyReader[];
}

const asRecord = (body: unknown): Record<string, unknown> | null =>
  body && typeof body === 'object' ? (body as Record<string, unknown>) : null;

const nonEmpty = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

/** `{detail: "..."}` (problem-details style). */
export const detailReader: FailureBodyReader = body => nonEmpty(asRecord(body)?.['detail']);

/** `{error: "..."}`. */
export const errorFieldReader: FailureBodyReader = body => nonEmpty(asRecord(body)?.['error']);

/** A plain-text body (`HttpErrorResponse.error` is the string itself); markup such as a proxy's HTML error page is not a sentence. */
export const textBodyReader: FailureBodyReader = body => {
  const text = nonEmpty(body);
  return text && !text.startsWith('<') ? text : null;
};

/** `{errors: ["...", ...]}` or `{errors: {field: "..." | ["..."]}}`, joined with a space. */
export const errorsReader: FailureBodyReader = body => {
  const errors = asRecord(body)?.['errors'];
  const values = Array.isArray(errors)
    ? errors
    : errors && typeof errors === 'object'
      ? Object.values(errors)
      : [];
  const parts = values
    .flat()
    .map(nonEmpty)
    .filter((part): part is string => part !== null);
  return parts.length ? parts.join(' ') : null;
};

const DEFAULT_READERS: readonly FailureBodyReader[] = [
  detailReader,
  errorsReader,
  errorFieldReader,
  textBodyReader,
];

/** The HTTP status of a failed call, or `null` when `error` carries none. 0 means unreachable. */
export function statusOf(error: unknown): number | null {
  if (error instanceof HttpErrorResponse) {
    return error.status;
  }
  const status = asRecord(error)?.['status'];
  return typeof status === 'number' ? status : null;
}

/** Wording stays with the caller (product copy); this only decides which sentence applies. */
export function httpFailureText(error: unknown, options: HttpFailureTextOptions): string {
  const status = statusOf(error);
  if (status === 0) {
    return options.unreachable;
  }
  if (error instanceof HttpErrorResponse) {
    for (const read of options.readers ?? DEFAULT_READERS) {
      const text = read(error.error);
      if (text) {
        return text;
      }
    }
  }
  return options.fallback;
}
