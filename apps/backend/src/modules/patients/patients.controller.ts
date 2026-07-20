import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UnprocessableEntityException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';
import { UploadedPhoto } from './storage/patient-photo-storage';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB (ver OpenAPI)
const ACCEPTED_MIME = ['image/jpeg', 'image/png'];

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPatientsQueryDto,
  ) {
    return this.patientsService.findAll(user.id, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePatientDto) {
    return this.patientsService.create(user.id, dto);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.patientsService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.patientsService.remove(user.id, id);
  }

  @Put(':id/photo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('photo', {
      // Sem `storage`: multer usa MemoryStorage e popula file.buffer, que o
      // provider de storage grava onde quiser (disco hoje, R2 no futuro).
      limits: { fileSize: MAX_PHOTO_BYTES },
      // Tipos anotados localmente: o projeto não instala @types/multer.
      fileFilter: (
        _req: unknown,
        file: { mimetype: string },
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        if (ACCEPTED_MIME.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new UnprocessableEntityException(
              'Formato inválido. Envie uma imagem JPG ou PNG.',
            ),
            false,
          );
        }
      },
    }),
  )
  uploadPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedPhoto | undefined,
  ) {
    return this.patientsService.setPhoto(user.id, id, file);
  }

  @Delete(':id/photo')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.patientsService.removePhoto(user.id, id);
  }
}
