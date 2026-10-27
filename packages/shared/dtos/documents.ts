import type { PaginatedResponse } from './pagination';
import type { PatientDto, PatientSummaryDto } from './patients';

// Limite rígido de payload nas funções serverless da Vercel (4,5 MB).
export const MAX_BLOB_UPLOAD_BYTES = Math.floor(4.5 * 1024 * 1024);

export const ACCEPTED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type AcceptedDocumentMimeType = (typeof ACCEPTED_DOCUMENT_MIME_TYPES)[number];

export interface DocumentDto {
  id: string;
  patient_id: string;
  appointment_id: string | null; // atendimento vinculado, se houver
  name: string;
  type: string | null; // ex.: "exame_sangue", "raio_x", "ultrassom", "laudo"
  exam_date: string; // YYYY-MM-DD
  mime_type: string;
  size_bytes: number;
  url: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Detalhe inclui paciente aninhado (GET /documents/:id).
export interface DocumentDetailDto extends DocumentDto {
  patient: PatientDto;
}

// Item de GET /documents: documento + resumo do paciente.
export interface DocumentListItemDto extends DocumentDto {
  patient: PatientSummaryDto;
}

export interface CreateDocumentRequest {
  patient_id: string;
  appointment_id?: string | null;
  name: string;
  type?: string | null;
  exam_date: string; // YYYY-MM-DD
  notes?: string | null;
}

export interface UpdateDocumentRequest {
  appointment_id?: string | null;
  name?: string;
  type?: string | null;
  exam_date?: string; // YYYY-MM-DD
  notes?: string | null;
}

export type DocumentListResponse = PaginatedResponse<DocumentListItemDto>;
