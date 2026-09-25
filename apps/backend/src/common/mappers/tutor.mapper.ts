import { Patient, Tutor } from '@prisma/client';
import type { TutorDto, TutorListItemDto } from '@meupaciente/shared';

export function toTutorDto(tutor: Tutor): TutorDto {
  return {
    id: tutor.id,
    name: tutor.name,
    phone: tutor.phone,
    email: tutor.email,
    created_at: tutor.created_at.toISOString(),
    updated_at: tutor.updated_at.toISOString(),
  };
}

export function toTutorListItemDto(
  tutor: Tutor & {
    patients: Pick<Patient, 'id' | 'name'>[];
    _count: { patients: number };
  },
): TutorListItemDto {
  return {
    ...toTutorDto(tutor),
    patients_count: tutor._count.patients,
    patients: tutor.patients.map((patient) => ({
      id: patient.id,
      name: patient.name,
    })),
  };
}
