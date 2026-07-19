import { Location } from '@prisma/client';
import type { LocationDto } from '@felino/shared';

export function toLocationDto(location: Location): LocationDto {
  return {
    id: location.id,
    name: location.name,
    address: location.address,
    phone: location.phone,
    created_at: location.created_at.toISOString(),
    updated_at: location.updated_at.toISOString(),
  };
}
