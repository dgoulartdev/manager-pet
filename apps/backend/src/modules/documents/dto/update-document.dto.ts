import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { UpdateDocumentRequest } from '@meupaciente/shared';
import { IsOptionalNotNull } from '../../../common/decorators/is-optional-not-null.decorator';
import { IsDateOnly } from '../../../common/decorators/is-date-only.decorator';

export class UpdateDocumentDto implements UpdateDocumentRequest {
  @IsOptional()
  @IsUUID()
  appointment_id?: string | null;

  @IsOptionalNotNull()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  type?: string | null;

  @IsOptionalNotNull()
  @IsDateOnly()
  exam_date?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
