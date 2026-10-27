import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UPLOADS_ROOT } from '../../patients/storage/local-disk-patient-photo-storage';
import {
  DocumentStorage,
  extensionForDocumentMime,
  UploadedDocumentFile,
} from './document-storage';

const DOCUMENTS_SUBDIR = 'documents';
const PUBLIC_PREFIX = '/uploads/documents';

@Injectable()
export class LocalDiskDocumentStorage implements DocumentStorage {
  private readonly logger = new Logger(LocalDiskDocumentStorage.name);
  private readonly dir = join(UPLOADS_ROOT, DOCUMENTS_SUBDIR);
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    const explicit = config.get<string>('PUBLIC_URL')?.replace(/\/$/, '');
    const port = config.get<string>('PORT') ?? '3000';
    this.baseUrl = explicit ?? `http://localhost:${port}`;
  }

  async save(documentId: string, file: UploadedDocumentFile): Promise<string> {
    await mkdir(this.dir, { recursive: true });
    const ext = extensionForDocumentMime(file.mimetype);
    const filename = `${documentId}.${ext}`;
    await writeFile(join(this.dir, filename), file.buffer);
    return `${this.baseUrl}${PUBLIC_PREFIX}/${filename}`;
  }

  async remove(documentUrl: string): Promise<void> {
    const filename = basename(documentUrl);
    if (!filename) return;
    try {
      await rm(join(this.dir, filename), { force: true });
    } catch (err) {
      this.logger.warn(`Falha ao remover documento ${filename}: ${String(err)}`);
    }
  }
}
