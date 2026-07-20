import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, Sex as PrismaSex, Patient, Tutor } from '@prisma/client';
import type {
  PaginatedResponse,
  PatientDetailDto,
  PatientDto,
  PhotoUploadResponse,
} from '@felino/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination';
import {
  toPatientDetailDto,
  toPatientDto,
} from '../../common/mappers/patient.mapper';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';
import {
  PATIENT_PHOTO_STORAGE,
  PatientPhotoStorage,
  UploadedPhoto,
} from './storage/patient-photo-storage';

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PATIENT_PHOTO_STORAGE)
    private readonly photoStorage: PatientPhotoStorage,
  ) {}

  async create(userId: string, dto: CreatePatientDto): Promise<PatientDto> {
    // O tutor precisa existir e pertencer ao usuário do token.
    await this.getOwnedTutor(userId, dto.tutor_id);

    const patient = await this.prisma.patient.create({
      data: {
        user_id: userId,
        tutor_id: dto.tutor_id,
        name: dto.name,
        species: dto.species ?? null,
        breed: dto.breed ?? null,
        color: dto.color ?? null,
        birth_date: dto.birth_date ? new Date(dto.birth_date) : null,
        ...(dto.sex !== undefined
          ? { sex: dto.sex as unknown as PrismaSex }
          : {}),
      },
    });
    return toPatientDto(patient);
  }

  async findAll(
    userId: string,
    query: ListPatientsQueryDto,
  ): Promise<PaginatedResponse<PatientDto>> {
    const { page, per_page, q, tutor_id } = query;

    const where: Prisma.PatientWhereInput = {
      user_id: userId,
      ...(tutor_id ? { tutor_id } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { tutor: { name: { contains: q, mode: 'insensitive' } } },
              { tutor: { phone: { contains: q } } },
            ],
          }
        : {}),
    };

    const [patients, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * per_page,
        take: per_page,
      }),
      this.prisma.patient.count({ where }),
    ]);

    return paginate(patients.map(toPatientDto), total, page, per_page);
  }

  async findOne(userId: string, id: string): Promise<PatientDetailDto> {
    const patient = await this.getOwnedWithTutor(userId, id);
    return toPatientDetailDto(patient);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdatePatientDto,
  ): Promise<PatientDto> {
    await this.getOwned(userId, id);

    // Só toca nos campos enviados. `null` explícito limpa o campo anulável.
    const data: Prisma.PatientUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.species !== undefined) data.species = dto.species;
    if (dto.breed !== undefined) data.breed = dto.breed;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.sex !== undefined) data.sex = dto.sex as unknown as PrismaSex;
    if (dto.birth_date !== undefined) {
      data.birth_date = dto.birth_date ? new Date(dto.birth_date) : null;
    }

    const patient = await this.prisma.patient.update({ where: { id }, data });
    return toPatientDto(patient);
  }

  async remove(userId: string, id: string): Promise<void> {
    const patient = await this.getOwned(userId, id);

    // Apaga o arquivo de foto (se houver) antes de remover o registro.
    if (patient.photo_url) {
      await this.photoStorage.remove(patient.photo_url);
    }

    // Os atendimentos (e seus documentos) são removidos em cascata pelo banco
    // (FK ON DELETE CASCADE — ver migration inicial).
    await this.prisma.patient.delete({ where: { id } });
  }

  async setPhoto(
    userId: string,
    id: string,
    file: UploadedPhoto | undefined,
  ): Promise<PhotoUploadResponse> {
    if (!file) {
      throw new UnprocessableEntityException(
        'Arquivo de foto é obrigatório (campo "photo").',
      );
    }
    const patient = await this.getOwned(userId, id);

    const photoUrl = await this.photoStorage.save(id, file);

    // Se a foto anterior tinha extensão diferente, o arquivo antigo ficaria
    // órfão; remove para não acumular lixo.
    if (patient.photo_url && patient.photo_url !== photoUrl) {
      await this.photoStorage.remove(patient.photo_url);
    }

    await this.prisma.patient.update({
      where: { id },
      data: { photo_url: photoUrl },
    });

    return { photo_url: photoUrl };
  }

  async removePhoto(userId: string, id: string): Promise<void> {
    const patient = await this.getOwned(userId, id);
    if (patient.photo_url) {
      await this.photoStorage.remove(patient.photo_url);
      await this.prisma.patient.update({
        where: { id },
        data: { photo_url: null },
      });
    }
  }

  // Garante que o paciente existe E pertence ao usuário do token (ownership).
  private async getOwned(userId: string, id: string): Promise<Patient> {
    const patient = await this.prisma.patient.findFirst({
      where: { id, user_id: userId },
    });
    if (!patient) {
      throw new NotFoundException('Paciente não encontrado.');
    }
    return patient;
  }

  private async getOwnedWithTutor(
    userId: string,
    id: string,
  ): Promise<Patient & { tutor: Tutor }> {
    const patient = await this.prisma.patient.findFirst({
      where: { id, user_id: userId },
      include: { tutor: true },
    });
    if (!patient) {
      throw new NotFoundException('Paciente não encontrado.');
    }
    return patient;
  }

  private async getOwnedTutor(userId: string, tutorId: string): Promise<Tutor> {
    const tutor = await this.prisma.tutor.findFirst({
      where: { id: tutorId, user_id: userId },
    });
    if (!tutor) {
      throw new NotFoundException('Tutor não encontrado.');
    }
    return tutor;
  }
}
