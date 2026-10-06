import {effect, inject, untracked} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, type ParamMap, Router} from '@angular/router';
import {patchState, signalStoreFeature, withHooks} from '@ngrx/signals';

export interface UrlParamCodec<T> {
  encode: (value: T) => string;
  decode: (raw: string) => T;
  /**
   * Optional. Decodes every occurrence of a repeated query param
   * (`?tag=a&tag=b`). Without it only the first occurrence is read.
   */
  decodeAll?: (raw: readonly string[]) => T;
}

/**
 * `csv` maps a `string[]` to one comma-separated param (`?category=a,b`). On
 * read, repeated params (`?category=a&category=b`) and CSV values are merged.
 */
export type BuiltinCodec = 'string' | 'number' | 'boolean' | 'csv';

export interface UrlParamSchema<T> {
  param: string;
  default: T;
  codec?: BuiltinCodec | UrlParamCodec<T>;
}

type Leaf =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | readonly unknown[]
  | ((...args: never[]) => unknown);

/** Dot-separated paths to every field of `T`, including the nested ones. */
export type StatePath<T> = T extends Leaf
  ? never
  : {[K in keyof T & string]: K | `${K}.${StatePath<NonNullable<T[K]>>}`}[keyof T & string];

export type StatePathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof NonNullable<T>
    ? StatePathValue<NonNullable<T>[K], Rest>
    : never
  : P extends keyof NonNullable<T>
    ? NonNullable<T>[P]
    : never;

/**
 * Keyed by a state field (`query`) or, for object fields, a dot path to a
 * nested field (`'filters.category'`). One query param per entry.
 */
export type UrlSyncSchema<TState> = {
  [P in StatePath<TState>]?: UrlParamSchema<StatePathValue<TState, P>>;
};

const STRING_CODEC: UrlParamCodec<string> = {
  encode: v => v,
  decode: v => v,
};

const NUMBER_CODEC: UrlParamCodec<number> = {
  encode: v => String(v),
  decode: v => Number(v),
};

const BOOLEAN_CODEC: UrlParamCodec<boolean> = {
  encode: v => (v ? 'true' : 'false'),
  decode: v => v === 'true',
};

function splitCsv(raw: readonly string[]): string[] {
  return raw.flatMap(value => value.split(',')).filter(item => item !== '');
}

const CSV_CODEC: UrlParamCodec<string[]> = {
  encode: v => v.join(','),
  decode: raw => splitCsv([raw]),
  decodeAll: raw => splitCsv(raw),
};

function resolveCodec<T>(codec: UrlParamSchema<T>['codec']): UrlParamCodec<T> {
  if (codec && typeof codec === 'object') {
    return codec;
  }
  switch (codec) {
    case 'number':
      return NUMBER_CODEC as unknown as UrlParamCodec<T>;
    case 'boolean':
      return BOOLEAN_CODEC as unknown as UrlParamCodec<T>;
    case 'csv':
      return CSV_CODEC as unknown as UrlParamCodec<T>;
    case 'string':
    case undefined:
      return STRING_CODEC as unknown as UrlParamCodec<T>;
  }
}

function valuesEqual<T>(a: T, b: T): boolean {
  if (a === b) {
    return true;
  }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

function getAt(root: unknown, path: readonly string[]): unknown {
  let node = root;
  for (const key of path) {
    if (node === null || typeof node !== 'object') {
      return undefined;
    }
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

function setAt(root: unknown, path: readonly string[], value: unknown): unknown {
  const [key, ...rest] = path;
  if (key === undefined) {
    return value;
  }
  const base = root !== null && typeof root === 'object' ? (root as Record<string, unknown>) : {};
  return {...base, [key]: setAt(base[key], rest, value)};
}

interface UrlSyncEntry {
  field: string;
  nested: string[];
  param: string;
  default: unknown;
  codec: UrlParamCodec<unknown>;
}

function toEntry(path: string, cfg: UrlParamSchema<unknown>): UrlSyncEntry {
  const [field = path, ...nested] = path.split('.');
  return {
    field,
    nested,
    param: cfg.param,
    default: cfg.default,
    codec: resolveCodec(cfg.codec),
  };
}

function decodeParam(entry: UrlSyncEntry, raw: readonly string[]): unknown {
  const {codec} = entry;
  return codec.decodeAll ? codec.decodeAll(raw) : codec.decode(raw[0] ?? '');
}

export function withUrlSync<TState extends object>(schema: UrlSyncSchema<TState>) {
  const entries = Object.entries(schema).map(([path, cfg]) =>
    toEntry(path, cfg as UrlParamSchema<unknown>)
  );

  const signature = (read: (param: string) => readonly string[]): string =>
    JSON.stringify(entries.map(entry => read(entry.param)));

  return signalStoreFeature(
    withHooks({
      onInit(store) {
        const route = inject(ActivatedRoute);
        const router = inject(Router);
        const signals = store as unknown as Record<string, () => unknown>;

        // Signature of the last URL this feature wrote, so its echo through
        // `queryParamMap` is not mistaken for an outside navigation.
        let lastWritten: string | null = null;

        const hydrate = (params: ParamMap, resetMissing: boolean): void => {
          const patch: Record<string, unknown> = {};
          for (const entry of entries) {
            const raw = params.getAll(entry.param);
            if (raw.length === 0 && !resetMissing) {
              continue;
            }
            const value = raw.length > 0 ? decodeParam(entry, raw) : entry.default;
            const current =
              entry.field in patch ? patch[entry.field] : untracked(signals[entry.field]);
            if (!valuesEqual(getAt(current, entry.nested), value)) {
              patch[entry.field] = setAt(current, entry.nested, value);
            }
          }
          if (Object.keys(patch).length > 0) {
            patchState(store, patch as Partial<object>);
          }
        };

        // The first emission is the URL the store was created under: params it
        // lacks leave the initial state alone. Later emissions are navigations
        // on a reused route: params they lack fall back to their default.
        let initial = true;
        route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
          if (initial) {
            initial = false;
            hydrate(params, false);
            return;
          }
          if (signature(param => params.getAll(param)) === lastWritten) {
            lastWritten = null;
            return;
          }
          hydrate(params, true);
        });

        let firstRun = true;
        effect(() => {
          const queryParams: Record<string, string | null> = {};
          for (const entry of entries) {
            const value = getAt(signals[entry.field](), entry.nested);
            queryParams[entry.param] = valuesEqual(value, entry.default)
              ? null
              : entry.codec.encode(value);
          }
          if (firstRun) {
            firstRun = false;
            return;
          }
          untracked(() => {
            lastWritten = signature(param => {
              const encoded = queryParams[param];
              return encoded === null || encoded === undefined ? [] : [encoded];
            });
            void router.navigate([], {
              queryParams,
              queryParamsHandling: 'merge',
              replaceUrl: true,
              relativeTo: route,
            });
          });
        });
      },
    })
  );
}
