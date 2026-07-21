import type { LocationType } from '../enums';
import type { PaginatedResponse } from './pagination';
import type { PatientDto } from './patients';
import type { LocationDto } from './locations';

export interface AppointmentDto {
  id: string;
  patient_id: string;
  date: string; // YYYY-MM-DD
  location_type: LocationType;
  location_id: string | null; // preenchido se location_type = REGISTERED
  ad_hoc_location_name: string | null; // preenchido se location_type = AD_HOC
  home_address: string | null; // preenchido se location_type = HOME_VISIT
  weight_kg: number | null;
  chief_complaint: string | null;
  history: string | null;
  diagnosis: string | null;
  treatment: string | null;
  prescription: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Detalhe inclui paciente e local aninhados (GET /appointments/:id).
export interface AppointmentDetailDto extends AppointmentDto {
  patient: PatientDto;
  location: LocationDto | null;
}

export interface CreateAppointmentRequest {
  patient_id: string;
  date: string; // YYYY-MM-DD
  location_type: LocationType;
  location_id?: string | null; // obrigatório se location_type = REGISTERED
  ad_hoc_location_name?: string | null; // obrigatório se location_type = AD_HOC
  home_address?: string | null; // opcional se location_type = HOME_VISIT
  weight_kg?: number | null;
  chief_complaint?: string | null;
  history?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  prescription?: string | null;
  notes?: string | null;
}

export interface UpdateAppointmentRequest {
  date?: string;
  location_type?: LocationType;
  location_id?: string | null;
  ad_hoc_location_name?: string | null;
  home_address?: string | null;
  weight_kg?: number | null;
  chief_complaint?: string | null;
  history?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  prescription?: string | null;
  notes?: string | null;
}

export type AppointmentListResponse = PaginatedResponse<AppointmentDto>;
