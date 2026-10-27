import { Document, Patient } from '@prisma/client';
import type {
  DocumentDetailDto,
  DocumentDto,
  DocumentListItemDto,
} from '@meupaciente/shared';
import { PatientSummary, toPatientDto, toPatientSummaryDto } from './patient.mapper';

export function toDocumentDto(document: Document): DocumentDto {
  return {
    id: document.id,
    patient_id: document.patient_id,
    appointment_id: document.appointment_id,
    name: document.name,
    type: document.type,
    exam_date: document.exam_date.toISOString().slice(0, 10),
    mime_type: document.mime_type,
    size_bytes: document.size_bytes,
    url: document.url,
    notes: document.notes,
    created_at: document.created_at.toISOString(),
    updated_at: document.updated_at.toISOString(),
  };
}

export function toDocumentListItemDto(
  document: Document & { patient: PatientSummary },
): DocumentListItemDto {
  return {
    ...toDocumentDto(document),
    patient: toPatientSummaryDto(document.patient),
  };
}

export function toDocumentDetailDto(
  document: Document & { patient: Patient },
): DocumentDetailDto {
  return {
    ...toDocumentDto(document),
    patient: toPatientDto(document.patient),
  };
}
