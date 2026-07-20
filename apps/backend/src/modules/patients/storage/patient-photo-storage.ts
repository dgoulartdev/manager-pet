/**
 * Abstração de storage de foto de paciente.
 *
 * A implementação atual (disco local) é temporária para o MVP. A interface é a
 * costura pela qual um provider real (Cloudflare R2 / S3) entra no pós-MVP:
 * basta uma nova classe que implemente este contrato e trocar o binding no
 * módulo — o PatientsService não muda. Ver ADR-007.
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
