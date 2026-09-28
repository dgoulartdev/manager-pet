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

// Item de GET /locations: local + quantos atendimentos o usam (local em uso não pode ser excluído).
export interface LocationListItemDto extends LocationDto {
  appointments_count: number;
}

export type LocationListResponse = PaginatedResponse<LocationListItemDto>;
