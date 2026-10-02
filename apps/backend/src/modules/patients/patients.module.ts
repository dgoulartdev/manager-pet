import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PATIENT_PHOTO_STORAGE, PatientPhotoStorage } from './storage/patient-photo-storage';
import { LocalDiskPatientPhotoStorage } from './storage/local-disk-patient-photo-storage';
import { VercelBlobPatientPhotoStorage } from './storage/vercel-blob-patient-photo-storage';

@Module({
  controllers: [PatientsController],
  providers: [
    PatientsService,
    {
      provide: PATIENT_PHOTO_STORAGE,
      inject: [ConfigService],
      // Com o Vercel Blob conectado ao projeto, a Vercel põe BLOB_STORE_ID (ou
      // BLOB_READ_WRITE_TOKEN) no ambiente e as fotos vão para ele (ADR-007).
      // Sem ele — no desenvolvimento —, vão para o disco local.
      useFactory: (config: ConfigService): PatientPhotoStorage =>
        config.get<string>('BLOB_STORE_ID') || config.get<string>('BLOB_READ_WRITE_TOKEN')
          ? new VercelBlobPatientPhotoStorage()
          : new LocalDiskPatientPhotoStorage(config),
    },
  ],
})
export class PatientsModule {}
