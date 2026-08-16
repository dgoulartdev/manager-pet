import type { PaginatedResponse } from '@meupaciente/shared';

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  per_page: number,
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      per_page,
      total,
      total_pages: Math.ceil(total / per_page),
    },
  };
}
