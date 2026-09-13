import { Patient, Vaccine } from '@prisma/client';
import type { VaccineDetailDto, VaccineDto } from '@meupaciente/shared';
import { toPatientDto } from './patient.mapper';

export function toVaccineDto(vaccine: Vaccine): VaccineDto {
  return {
    id: vaccine.id,
    patient_id: vaccine.patient_id,
    appointment_id: vaccine.appointment_id,
    name: vaccine.name,
    manufacturer: vaccine.manufacturer,
    batch: vaccine.batch,
    application_date: vaccine.application_date.toISOString().slice(0, 10),
    next_dose_date: vaccine.next_dose_date
      ? vaccine.next_dose_date.toISOString().slice(0, 10)
      : null,
    notes: vaccine.notes,
    created_at: vaccine.created_at.toISOString(),
    updated_at: vaccine.updated_at.toISOString(),
  };
}

export function toVaccineDetailDto(
  vaccine: Vaccine & { patient: Patient },
): VaccineDetailDto {
  return {
    ...toVaccineDto(vaccine),
    patient: toPatientDto(vaccine.patient),
  };
}
