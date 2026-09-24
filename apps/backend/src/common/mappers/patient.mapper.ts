import { Patient, Tutor } from '@prisma/client';
import type {
  PatientDetailDto,
  PatientDto,
  PatientListItemDto,
} from '@meupaciente/shared';
import { Sex } from '@meupaciente/shared';
import { toTutorDto } from './tutor.mapper';

export function toPatientDto(patient: Patient): PatientDto {
  return {
    id: patient.id,
    tutor_id: patient.tutor_id,
    name: patient.name,
    species: patient.species,
    sex: patient.sex as Sex,
    breed: patient.breed,
    color: patient.color,
    // birth_date é uma data (sem hora); expõe só YYYY-MM-DD.
    birth_date: patient.birth_date
      ? patient.birth_date.toISOString().slice(0, 10)
      : null,
    photo_url: patient.photo_url,
    created_at: patient.created_at.toISOString(),
    updated_at: patient.updated_at.toISOString(),
  };
}

export function toPatientListItemDto(
  patient: Patient & { tutor: Pick<Tutor, 'id' | 'name' | 'phone'> },
): PatientListItemDto {
  return {
    ...toPatientDto(patient),
    tutor: {
      id: patient.tutor.id,
      name: patient.tutor.name,
      phone: patient.tutor.phone,
    },
  };
}

export function toPatientDetailDto(
  patient: Patient & { tutor: Tutor },
): PatientDetailDto {
  return {
    ...toPatientDto(patient),
    tutor: toTutorDto(patient.tutor),
  };
}
