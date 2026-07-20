import type { Sex } from '../enums';
import type { PaginatedResponse } from './pagination';
import type { TutorDto } from './tutors';

export interface PatientDto {
  id: string;
  tutor_id: string;
  name: string;
  species: string | null;
  sex: Sex;
  breed: string | null;
  color: string | null;
  birth_date: string | null; // YYYY-MM-DD
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

// Detalhe inclui o tutor aninhado (GET /patients/:id).
export interface PatientDetailDto extends PatientDto {
  tutor: TutorDto;
}

export interface CreatePatientRequest {
  tutor_id: string;
  name: string;
  species?: string | null;
  sex?: Sex;
  breed?: string | null;
  color?: string | null;
  birth_date?: string | null; // YYYY-MM-DD
}

export interface UpdatePatientRequest {
  name?: string;
  species?: string | null;
  sex?: Sex;
  breed?: string | null;
  color?: string | null;
  birth_date?: string | null; // YYYY-MM-DD
}

export interface PhotoUploadResponse {
  photo_url: string;
}

export type PatientListResponse = PaginatedResponse<PatientDto>;
