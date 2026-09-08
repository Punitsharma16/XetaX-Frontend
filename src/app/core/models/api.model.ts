/**
 * Shared API envelopes.
 *
 * The CRM service wraps every payload in `ApiResponse<T>`
 * (com.xetax.crm.common.responce.ApiResponse). The Auth service returns its
 * DTOs raw, without the wrapper — services model that difference explicitly.
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

/** Spring Data `Page<T>` as serialised by Jackson. */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

/** Empty page used as a safe fallback while loading or after an error. */
export function emptyPage<T>(size = 20): Page<T> {
  return {
    content: [],
    totalElements: 0,
    totalPages: 0,
    size,
    number: 0,
    first: true,
    last: true,
    numberOfElements: 0,
    empty: true,
  };
}

export type SortDirection = 'ASC' | 'DESC';
