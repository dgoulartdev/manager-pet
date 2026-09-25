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

// Paciente resumido na listagem de tutores: o suficiente para reconhecer o dono pelo animal.
export interface TutorPatientSummaryDto {
  id: string;
  name: string;
}

// Item de GET /tutors: tutor + total de pacientes e os primeiros nomes (ordem alfabética).
export interface TutorListItemDto extends TutorDto {
  patients_count: number;
  patients: TutorPatientSummaryDto[];
}

export type TutorListResponse = PaginatedResponse<TutorListItemDto>;
