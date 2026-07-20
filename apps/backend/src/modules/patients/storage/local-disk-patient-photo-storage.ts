import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PatientPhotoStorage,
  UploadedPhoto,
} from './patient-photo-storage';

// Diretório raiz servido estaticamente (ver main.ts). As fotos ficam em
// <UPLOADS_ROOT>/patients e são expostas em /uploads/patients/<arquivo>.
export const UPLOADS_ROOT = join(process.cwd(), 'uploads');
const PATIENTS_SUBDIR = 'patients';
const PUBLIC_PREFIX = '/uploads/patients';

/**
 * Storage de foto em disco local. Temporário para o MVP (ver ADR-007).
 * Um arquivo por paciente (nome = <patientId>.<ext>): novo upload substitui o
 * anterior de mesma extensão; extensões diferentes são limpas pelo service.
 */
@Injectable()
export class LocalDiskPatientPhotoStorage implements PatientPhotoStorage {
  private readonly logger = new Logger(LocalDiskPatientPhotoStorage.name);
  private readonly dir = join(UPLOADS_ROOT, PATIENTS_SUBDIR);
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    const explicit = config.get<string>('PUBLIC_URL')?.replace(/\/$/, '');
    const port = config.get<string>('PORT') ?? '3000';
    this.baseUrl = explicit ?? `http://localhost:${port}`;
  }

  async save(patientId: string, file: UploadedPhoto): Promise<string> {
    await mkdir(this.dir, { recursive: true });
    const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
    const filename = `${patientId}.${ext}`;
    await writeFile(join(this.dir, filename), file.buffer);
    return `${this.baseUrl}${PUBLIC_PREFIX}/${filename}`;
  }

  async remove(photoUrl: string): Promise<void> {
    // basename descarta qualquer componente de caminho — evita path traversal.
    const filename = basename(photoUrl);
    if (!filename) return;
    try {
      await rm(join(this.dir, filename), { force: true });
    } catch (err) {
      // Falha ao apagar arquivo órfão não deve quebrar a operação de negócio.
      this.logger.warn(`Falha ao remover foto ${filename}: ${String(err)}`);
    }
  }
}
