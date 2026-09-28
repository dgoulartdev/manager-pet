import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Appointment, Patient, Prisma, Vaccine } from '@prisma/client';
import type {
  PaginatedResponse,
  VaccineDetailDto,
  VaccineDto,
  VaccineListItemDto,
} from '@meupaciente/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination';
import {
  toVaccineDetailDto,
  toVaccineDto,
  toVaccineListItemDto,
} from '../../common/mappers/vaccine.mapper';
import { PATIENT_SUMMARY_SELECT } from '../../common/mappers/patient.mapper';
import { CreateVaccineDto } from './dto/create-vaccine.dto';
import { UpdateVaccineDto } from './dto/update-vaccine.dto';
import { ListVaccinesQueryDto } from './dto/list-vaccines-query.dto';

@Injectable()
export class VaccinesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateVaccineDto): Promise<VaccineDto> {
    await this.getOwnedPatient(userId, dto.patient_id);
    if (dto.appointment_id) {
      await this.getOwnedAppointment(userId, dto.appointment_id, dto.patient_id);
    }

    const vaccine = await this.prisma.vaccine.create({
      data: {
        user_id: userId,
        patient_id: dto.patient_id,
        appointment_id: dto.appointment_id ?? null,
        name: dto.name,
        manufacturer: dto.manufacturer ?? null,
        batch: dto.batch ?? null,
        application_date: new Date(dto.application_date),
        next_dose_date: dto.next_dose_date ? new Date(dto.next_dose_date) : null,
        notes: dto.notes ?? null,
      },
    });
    return toVaccineDto(vaccine);
  }

  async findAll(
    userId: string,
    query: ListVaccinesQueryDto,
  ): Promise<PaginatedResponse<VaccineListItemDto>> {
    const { page, per_page, patient_id, latest_only, next_dose_to } = query;

    const where: Prisma.VaccineWhereInput = {
      user_id: userId,
      ...(patient_id ? { patient_id } : {}),
      ...(latest_only ? { id: { in: await this.findLatestDoseIds(userId) } } : {}),
      ...(next_dose_to ? { next_dose_date: { lte: new Date(next_dose_to) } } : {}),
    };

    const [vaccines, total] = await this.prisma.$transaction([
      this.prisma.vaccine.findMany({
        where,
        // Resumo do paciente: a lista de reforços pendentes mistura pacientes.
        include: { patient: { select: PATIENT_SUMMARY_SELECT } },
        // Buscando reforços pendentes, o mais urgente (ou mais atrasado) vem primeiro.
        orderBy: next_dose_to
          ? [{ next_dose_date: 'asc' }, { application_date: 'desc' }]
          : [{ application_date: 'desc' }, { created_at: 'desc' }],
        skip: (page - 1) * per_page,
        take: per_page,
      }),
      this.prisma.vaccine.count({ where }),
    ]);

    return paginate(vaccines.map(toVaccineListItemDto), total, page, per_page);
  }

  async findOne(userId: string, id: string): Promise<VaccineDetailDto> {
    const vaccine = await this.getOwnedWithRelations(userId, id);
    return toVaccineDetailDto(vaccine);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateVaccineDto,
  ): Promise<VaccineDto> {
    const existing = await this.getOwned(userId, id);

    if (dto.appointment_id) {
      await this.getOwnedAppointment(userId, dto.appointment_id, existing.patient_id);
    }

    const data: Prisma.VaccineUncheckedUpdateInput = {};
    if (dto.appointment_id !== undefined) data.appointment_id = dto.appointment_id;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.manufacturer !== undefined) data.manufacturer = dto.manufacturer;
    if (dto.batch !== undefined) data.batch = dto.batch;
    if (dto.application_date !== undefined)
      data.application_date = new Date(dto.application_date);
    if (dto.next_dose_date !== undefined)
      data.next_dose_date = dto.next_dose_date ? new Date(dto.next_dose_date) : null;
    if (dto.notes !== undefined) data.notes = dto.notes;

    const vaccine = await this.prisma.vaccine.update({ where: { id }, data });
    return toVaccineDto(vaccine);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.getOwned(userId, id);
    await this.prisma.vaccine.delete({ where: { id } });
  }

  /**
   * A dose mais recente de cada vacina de cada paciente. O nome identifica a
   * vacina sem diferenciar maiúsculas nem espaços nas pontas — a mesma regra da
   * carteira no frontend (lib/vaccines.ts). No mesmo dia, vale a registrada por
   * último. SQL puro porque o Prisma não agrupa por expressão (lower/trim).
   */
  private async findLatestDoseIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT DISTINCT ON (patient_id, lower(trim(name))) id
      FROM vaccines
      WHERE user_id = ${userId}
      ORDER BY patient_id, lower(trim(name)), application_date DESC, created_at DESC
    `;
    return rows.map((row) => row.id);
  }

  private async getOwned(userId: string, id: string): Promise<Vaccine> {
    const vaccine = await this.prisma.vaccine.findFirst({
      where: { id, user_id: userId },
    });
    if (!vaccine) {
      throw new NotFoundException('Vacina não encontrada.');
    }
    return vaccine;
  }

  private async getOwnedWithRelations(
    userId: string,
    id: string,
  ): Promise<Vaccine & { patient: Patient }> {
    const vaccine = await this.prisma.vaccine.findFirst({
      where: { id, user_id: userId },
      include: { patient: true },
    });
    if (!vaccine) {
      throw new NotFoundException('Vacina não encontrada.');
    }
    return vaccine;
  }

  private async getOwnedPatient(userId: string, patientId: string): Promise<Patient> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, user_id: userId },
    });
    if (!patient) {
      throw new NotFoundException('Paciente não encontrado.');
    }
    return patient;
  }

  // Confere ownership e que o atendimento é do mesmo paciente da vacina.
  private async getOwnedAppointment(
    userId: string,
    appointmentId: string,
    patientId: string,
  ): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, user_id: userId },
    });
    if (!appointment) {
      throw new NotFoundException('Atendimento não encontrado.');
    }
    if (appointment.patient_id !== patientId) {
      throw new UnprocessableEntityException(
        'appointment_id deve pertencer ao mesmo paciente da vacina.',
      );
    }
    return appointment;
  }
}
