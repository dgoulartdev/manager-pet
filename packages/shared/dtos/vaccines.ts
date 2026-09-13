import type { PaginatedResponse } from './pagination';
import type { PatientDto } from './patients';

export interface VaccineDto {
  id: string;
  patient_id: string;
  appointment_id: string | null; // atendimento em que foi aplicada, se houver
  name: string;
  manufacturer: string | null;
  batch: string | null;
  application_date: string; // YYYY-MM-DD
  next_dose_date: string | null; // YYYY-MM-DD, previsão do reforço
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Detalhe inclui paciente aninhado (GET /vaccines/:id).
export interface VaccineDetailDto extends VaccineDto {
  patient: PatientDto;
}

export interface CreateVaccineRequest {
  patient_id: string;
  appointment_id?: string | null;
  name: string;
  manufacturer?: string | null;
  batch?: string | null;
  application_date: string; // YYYY-MM-DD
  next_dose_date?: string | null;
  notes?: string | null;
}

export interface UpdateVaccineRequest {
  appointment_id?: string | null;
  name?: string;
  manufacturer?: string | null;
  batch?: string | null;
  application_date?: string;
  next_dose_date?: string | null;
  notes?: string | null;
}

export type VaccineListResponse = PaginatedResponse<VaccineDto>;
