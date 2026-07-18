import { User } from '@prisma/client';
import type { UserDto } from '@felino/shared';

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at.toISOString(),
    updated_at: user.updated_at.toISOString(),
  };
}
