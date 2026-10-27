import { del, put } from '@vercel/blob';
import { Logger } from '@nestjs/common';
import {
  DocumentStorage,
  extensionForDocumentMime,
  UploadedDocumentFile,
} from './document-storage';

export interface VercelBlobDocumentStorageOptions {
  token?: string;
  storeId?: string;
}

/**
 * Storage de documentos e exames em uma store dedicada do Vercel Blob (ADR-005 / ADR-007).
 * Utiliza credenciais próprias (`DOCUMENTS_BLOB_READ_WRITE_TOKEN` / `DOCUMENTS_BLOB_STORE_ID`)
 * para manter os exames separados da store de fotos de perfil dos pacientes.
 */
export class VercelBlobDocumentStorage implements DocumentStorage {
  private readonly logger = new Logger(VercelBlobDocumentStorage.name);
  private readonly token?: string;
  private readonly storeId?: string;

  constructor(options: VercelBlobDocumentStorageOptions = {}) {
    this.token = options.token || undefined;
    this.storeId = options.storeId || undefined;
  }

  async save(documentId: string, file: UploadedDocumentFile): Promise<string> {
    const ext = extensionForDocumentMime(file.mimetype);
    const blob = await put(`documents/${documentId}.${ext}`, file.buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.mimetype,
      ...(this.token ? { token: this.token } : {}),
      ...(this.storeId ? { storeId: this.storeId } : {}),
    });
    return blob.url;
  }

  async remove(documentUrl: string): Promise<void> {
    try {
      await del(documentUrl, {
        ...(this.token ? { token: this.token } : {}),
        ...(this.storeId ? { storeId: this.storeId } : {}),
      });
    } catch (err) {
      this.logger.warn(`Falha ao remover documento ${documentUrl}: ${String(err)}`);
    }
  }
}
