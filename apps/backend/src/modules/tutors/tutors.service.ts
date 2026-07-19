import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Tutor } from '@prisma/client';
import type { PaginatedResponse, TutorDto } from '@felino/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination';
import { toTutorDto } from '../../common/mappers/tutor.mapper';
import { CreateTutorDto } from './dto/create-tutor.dto';
import { UpdateTutorDto } from './dto/update-tutor.dto';
import { ListTutorsQueryDto } from './dto/list-tutors-query.dto';

@Injectable()
export class TutorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTutorDto): Promise<TutorDto> {
    const tutor = await this.prisma.tutor.create({
      data: {
        user_id: userId,
        name: dto.name,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
      },
    });
    return toTutorDto(tutor);
  }

  async findAll(
    userId: string,
    query: ListTutorsQueryDto,
  ): Promise<PaginatedResponse<TutorDto>> {
    const { page, per_page, q } = query;

    const where: Prisma.TutorWhereInput = {
      user_id: userId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    };

    const [tutors, total] = await this.prisma.$transaction([
      this.prisma.tutor.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * per_page,
        take: per_page,
      }),
      this.prisma.tutor.count({ where }),
    ]);

    return paginate(tutors.map(toTutorDto), total, page, per_page);
  }

  async findOne(userId: string, id: string): Promise<TutorDto> {
    const tutor = await this.getOwned(userId, id);
    return toTutorDto(tutor);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTutorDto,
  ): Promise<TutorDto> {
    await this.getOwned(userId, id);
    const tutor = await this.prisma.tutor.update({
      where: { id },
      data: { name: dto.name, phone: dto.phone, email: dto.email },
    });
    return toTutorDto(tutor);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.getOwned(userId, id);

    const patients = await this.prisma.patient.count({
      where: { tutor_id: id },
    });
    if (patients > 0) {
      throw new ConflictException(
        'Não é possível remover um tutor com pacientes associados.',
      );
    }

    await this.prisma.tutor.delete({ where: { id } });
  }

  // Garante que o tutor existe E pertence ao usuário do token (ownership).
  private async getOwned(userId: string, id: string): Promise<Tutor> {
    const tutor = await this.prisma.tutor.findFirst({
      where: { id, user_id: userId },
    });
    if (!tutor) {
      throw new NotFoundException('Tutor não encontrado.');
    }
    return tutor;
  }
}
