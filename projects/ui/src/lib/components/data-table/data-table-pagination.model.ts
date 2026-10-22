export interface CmnTablePagination {
  totalCount: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

/** The page a pager control asks for: fetch `limit` rows from `offset`. */
export interface CmnPageChange {
  offset: number;
  limit: number;
}
