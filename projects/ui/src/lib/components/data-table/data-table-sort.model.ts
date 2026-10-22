export type CmnSortDirection = 'asc' | 'desc';

/** The column the table is sorted by and which way; `null` on the table means unsorted. */
export interface CmnTableSort {
  key: string;
  direction: CmnSortDirection;
}

/**
 * `client` sorts the given `rows` in the table. `server` leaves `rows` in the order given and
 * only emits `sortChange`, so the caller fetches them sorted.
 */
export type CmnSortMode = 'client' | 'server';
