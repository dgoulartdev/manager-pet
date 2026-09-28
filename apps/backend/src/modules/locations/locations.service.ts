import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Location, Prisma } from '@prisma/client';
import type {
  LocationDto,
  LocationListItemDto,
  PaginatedResponse,
} from '@meupaciente/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination';
import {
  toLocationDto,
  toLocationListItemDto,
} from '../../common/mappers/location.mapper';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { ListLocationsQueryDto } from './dto/list-locations-query.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateLocationDto): Promise<LocationDto> {
    const location = await this.prisma.location.create({
      data: {
        user_id: userId,
        name: dto.name,
        address: dto.address ?? null,
        phone: dto.phone ?? null,
      },
    });
    return toLocationDto(location);
  }

  async findAll(
    userId: string,
    query: ListLocationsQueryDto,
  ): Promise<PaginatedResponse<LocationListItemDto>> {
    const { page, per_page, q } = query;

    const where: Prisma.LocationWhereInput = {
      user_id: userId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { address: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    };

    const [locations, total] = await this.prisma.$transaction([
      this.prisma.location.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * per_page,
        take: per_page,
        // Local em uso não pode ser excluído: a lista já sabe quais estão.
        include: { _count: { select: { appointments: true } } },
      }),
      this.prisma.location.count({ where }),
    ]);

    return paginate(
      locations.map(toLocationListItemDto),
      total,
      page,
      per_page,
    );
  }

  async findOne(userId: string, id: string): Promise<LocationDto> {
    const location = await this.getOwned(userId, id);
    return toLocationDto(location);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateLocationDto,
  ): Promise<LocationDto> {
    await this.getOwned(userId, id);
    const location = await this.prisma.location.update({
      where: { id },
      data: { name: dto.name, address: dto.address, phone: dto.phone },
    });
    return toLocationDto(location);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.getOwned(userId, id);

    const appointments = await this.prisma.appointment.count({
      where: { location_id: id },
    });
    if (appointments > 0) {
      throw new ConflictException(
        'Não é possível remover um local referenciado por atendimentos.',
      );
    }

    await this.prisma.location.delete({ where: { id } });
  }

  // Garante que o local existe E pertence ao usuário do token (ownership).
  private async getOwned(userId: string, id: string): Promise<Location> {
    const location = await this.prisma.location.findFirst({
      where: { id, user_id: userId },
    });
    if (!location) {
      throw new NotFoundException('Local não encontrado.');
    }
    return location;
  }
}
