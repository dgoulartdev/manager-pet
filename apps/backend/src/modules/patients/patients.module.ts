import { Module } from '@nestjs/common';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PATIENT_PHOTO_STORAGE } from './storage/patient-photo-storage';
import { LocalDiskPatientPhotoStorage } from './storage/local-disk-patient-photo-storage';

@Module({
  controllers: [PatientsController],
  providers: [
    PatientsService,
    // Binding do storage de foto. Trocar por um provider R2/S3 no pós-MVP
    // (ver ADR-007) é só mudar a classe aqui.
    { provide: PATIENT_PHOTO_STORAGE, useClass: LocalDiskPatientPhotoStorage },
  ],
})
export class PatientsModule {}
