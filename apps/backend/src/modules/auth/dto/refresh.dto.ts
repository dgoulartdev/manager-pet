import { IsString } from 'class-validator';
import type { RefreshRequest } from '@meupaciente/shared';

export class RefreshDto implements RefreshRequest {
  @IsString()
  refresh_token!: string;
}
