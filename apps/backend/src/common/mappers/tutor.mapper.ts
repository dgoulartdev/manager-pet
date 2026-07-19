import { Tutor } from '@prisma/client';
import type { TutorDto } from '@felino/shared';

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
