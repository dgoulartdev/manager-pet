/**
 * Abstração de storage de foto de paciente.
 *
 * Duas implementações (ADR-007): disco local no desenvolvimento e Vercel Blob em
 * produção, escolhidas no PatientsModule. O PatientsService só conhece este
 * contrato, então trocar de storage nunca mexe nele.
 */

export interface UploadedPhoto {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

export interface PatientPhotoStorage {
  // Salva (ou substitui) a foto do paciente e devolve a URL pública.
  save(patientId: string, file: UploadedPhoto): Promise<string>;

  // Remove a foto apontada pela URL. Idempotente: não falha se já não existe.
  remove(photoUrl: string): Promise<void>;
}

// Token de injeção do provider de storage.
export const PATIENT_PHOTO_STORAGE = Symbol('PATIENT_PHOTO_STORAGE');
