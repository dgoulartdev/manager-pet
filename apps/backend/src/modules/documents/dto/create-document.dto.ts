import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { CreateDocumentRequest } from '@meupaciente/shared';
import { IsDateOnly } from '../../../common/decorators/is-date-only.decorator';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

export class CreateDocumentDto implements CreateDocumentRequest {
  @IsUUID()
  patient_id!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  appointment_id?: string | null;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(60)
  type?: string | null;

  @IsDateOnly()
  exam_date!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  notes?: string | null;
}
