import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Appointment, Location, Patient, Prisma } from '@prisma/client';
import { LocationType } from '@felino/shared';
import type {
  AppointmentDetailDto,
  AppointmentDto,
  PaginatedResponse,
} from '@felino/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination';
import {
  toAppointmentDetailDto,
  toAppointmentDto,
} from '../../common/mappers/appointment.mapper';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    dto: CreateAppointmentDto,
  ): Promise<AppointmentDto> {
    await this.getOwnedPatient(userId, dto.patient_id);

    const locationFields = await this.resolveLocationFields(userId, {
      location_type: dto.location_type,
      location_id: dto.location_id ?? null,
      ad_hoc_location_name: dto.ad_hoc_location_name ?? null,
      home_address: dto.home_address ?? null,
    });

    const appointment = await this.prisma.appointment.create({
      data: {
        user_id: userId,
        patient_id: dto.patient_id,
        date: new Date(dto.date),
        ...locationFields,
        weight_kg: dto.weight_kg ?? null,
        chief_complaint: dto.chief_complaint ?? null,
        history: dto.history ?? null,
        diagnosis: dto.diagnosis ?? null,
        treatment: dto.treatment ?? null,
        prescription: dto.prescription ?? null,
        notes: dto.notes ?? null,
      },
    });
    return toAppointmentDto(appointment);
  }

  async findAll(
    userId: string,
    query: ListAppointmentsQueryDto,
  ): Promise<PaginatedResponse<AppointmentDto>> {
    const { page, per_page, patient_id, location_id, date_from, date_to } =
      query;

    const where: Prisma.AppointmentWhereInput = {
      user_id: userId,
      ...(patient_id ? { patient_id } : {}),
      ...(location_id ? { location_id } : {}),
      ...(date_from || date_to
        ? {
            date: {
              ...(date_from ? { gte: new Date(date_from) } : {}),
              ...(date_to ? { lte: new Date(date_to) } : {}),
            },
          }
        : {}),
    };

    const [appointments, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * per_page,
        take: per_page,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return paginate(appointments.map(toAppointmentDto), total, page, per_page);
  }

  async findOne(userId: string, id: string): Promise<AppointmentDetailDto> {
    const appointment = await this.getOwnedWithRelations(userId, id);
    return toAppointmentDetailDto(appointment);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateAppointmentDto,
  ): Promise<AppointmentDto> {
    const existing = await this.getOwned(userId, id);

    const locationFields = await this.resolveLocationFields(userId, {
      location_type: dto.location_type ?? (existing.location_type as LocationType),
      location_id:
        dto.location_id !== undefined ? dto.location_id : existing.location_id,
      ad_hoc_location_name:
        dto.ad_hoc_location_name !== undefined
          ? dto.ad_hoc_location_name
          : existing.ad_hoc_location_name,
      home_address:
        dto.home_address !== undefined
          ? dto.home_address
          : existing.home_address,
    });

    const data: Prisma.AppointmentUpdateInput = { ...locationFields };
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.weight_kg !== undefined) data.weight_kg = dto.weight_kg;
    if (dto.chief_complaint !== undefined)
      data.chief_complaint = dto.chief_complaint;
    if (dto.history !== undefined) data.history = dto.history;
    if (dto.diagnosis !== undefined) data.diagnosis = dto.diagnosis;
    if (dto.treatment !== undefined) data.treatment = dto.treatment;
    if (dto.prescription !== undefined) data.prescription = dto.prescription;
    if (dto.notes !== undefined) data.notes = dto.notes;

    const appointment = await this.prisma.appointment.update({
      where: { id },
      data,
    });
    return toAppointmentDto(appointment);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.getOwned(userId, id);
    // Documentos anexados são removidos em cascata pelo banco (FK ON DELETE CASCADE).
    await this.prisma.appointment.delete({ where: { id } });
  }

  // Confere e normaliza os campos de local conforme location_type (regra de
  // negócio do checklist: cada tipo exige/permite campos diferentes).
  private async resolveLocationFields(
    userId: string,
    fields: {
      location_type: LocationType;
      location_id: string | null;
      ad_hoc_location_name: string | null;
      home_address: string | null;
    },
  ): Promise<{
    location_type: LocationType;
    location_id: string | null;
    ad_hoc_location_name: string | null;
    home_address: string | null;
  }> {
    const { location_type } = fields;

    if (location_type === LocationType.REGISTERED) {
      if (!fields.location_id) {
        throw new UnprocessableEntityException(
          'location_id é obrigatório quando location_type = REGISTERED.',
        );
      }
      await this.getOwnedLocation(userId, fields.location_id);
      return {
        location_type,
        location_id: fields.location_id,
        ad_hoc_location_name: null,
        home_address: null,
      };
    }

    if (location_type === LocationType.AD_HOC) {
      if (!fields.ad_hoc_location_name) {
        throw new UnprocessableEntityException(
          'ad_hoc_location_name é obrigatório quando location_type = AD_HOC.',
        );
      }
      return {
        location_type,
        location_id: null,
        ad_hoc_location_name: fields.ad_hoc_location_name,
        home_address: null,
      };
    }

    // HOME_VISIT: home_address é opcional, demais campos de local são limpos.
    return {
      location_type,
      location_id: null,
      ad_hoc_location_name: null,
      home_address: fields.home_address,
    };
  }

  // Garante que o atendimento existe E pertence ao usuário do token (ownership).
  private async getOwned(userId: string, id: string): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, user_id: userId },
    });
    if (!appointment) {
      throw new NotFoundException('Atendimento não encontrado.');
    }
    return appointment;
  }

  private async getOwnedWithRelations(
    userId: string,
    id: string,
  ): Promise<Appointment & { patient: Patient; location: Location | null }> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, user_id: userId },
      include: { patient: true, location: true },
    });
    if (!appointment) {
      throw new NotFoundException('Atendimento não encontrado.');
    }
    return appointment;
  }

  private async getOwnedPatient(
    userId: string,
    patientId: string,
  ): Promise<Patient> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, user_id: userId },
    });
    if (!patient) {
      throw new NotFoundException('Paciente não encontrado.');
    }
    return patient;
  }

  private async getOwnedLocation(
    userId: string,
    locationId: string,
  ): Promise<Location> {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, user_id: userId },
    });
    if (!location) {
      throw new NotFoundException('Local não encontrado.');
    }
    return location;
  }
}
