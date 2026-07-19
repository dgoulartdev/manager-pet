import type { PaginatedResponse } from './pagination';

export interface LocationDto {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLocationRequest {
  name: string;
  address?: string | null;
  phone?: string | null;
}

export interface UpdateLocationRequest {
  name?: string;
  address?: string | null;
  phone?: string | null;
}

export type LocationListResponse = PaginatedResponse<LocationDto>;
