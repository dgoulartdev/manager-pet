import { del, put } from '@vercel/blob';
import { Logger } from '@nestjs/common';
import { PatientPhotoStorage, UploadedPhoto } from './patient-photo-storage';

/**
 * Storage de foto no Vercel Blob (ADR-007): um armazenamento à parte do deploy,
 * então as fotos sobrevivem a qualquer publicação nova. As fotos são públicas — o
 * <img> do app carrega direto —, mas o sufixo aleatório torna o endereço impossível
 * de adivinhar e muda a cada troca, para o CDN nunca servir a foto antiga.
 * As credenciais vêm do ambiente (o SDK lê as que a Vercel põe ao conectar o Blob).
 */
export class VercelBlobPatientPhotoStorage implements PatientPhotoStorage {
  private readonly logger = new Logger(VercelBlobPatientPhotoStorage.name);

  async save(patientId: string, file: UploadedPhoto): Promise<string> {
    const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
    const blob = await put(`patients/${patientId}.${ext}`, file.buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.mimetype,
    });
    return blob.url;
  }

  async remove(photoUrl: string): Promise<void> {
    try {
      await del(photoUrl);
    } catch (err) {
      // Falha ao apagar foto órfã não deve quebrar a operação de negócio.
      this.logger.warn(`Falha ao remover foto ${photoUrl}: ${String(err)}`);
    }
  }
}
