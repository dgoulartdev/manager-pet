import { IsString } from 'class-validator';
import type { RefreshRequest } from '@felino/shared';

export class RefreshDto implements RefreshRequest {
  @IsString()
  refresh_token!: string;
}
