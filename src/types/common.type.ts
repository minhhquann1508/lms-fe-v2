/* ── Generic API envelope ── */
export interface ApiEnvelope<T> {
  data: T;
  message: string;
  path: string;
  statusCode: number;
  timestamp: string;
}

/* ── Paginated wrapper ── */
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}
