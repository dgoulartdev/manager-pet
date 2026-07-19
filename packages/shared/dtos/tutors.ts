import type { PaginatedResponse } from './pagination';

export interface TutorDto {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTutorRequest {
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface UpdateTutorRequest {
  name?: string;
  phone?: string | null;
  email?: string | null;
}

export type TutorListResponse = PaginatedResponse<TutorDto>;
