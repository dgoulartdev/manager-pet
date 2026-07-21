import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Appointment } from '@prisma/client';
import { LocationType } from '@felino/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

function buildAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'appt-1',
    user_id: 'user-1',
    patient_id: 'patient-1',
    date: new Date('2026-07-20T00:00:00.000Z'),
    location_type: LocationType.REGISTERED,
    location_id: 'location-1',
    ad_hoc_location_name: null,
    home_address: null,
    weight_kg: null,
    chief_complaint: null,
    history: null,
    diagnosis: null,
    treatment: null,
    prescription: null,
    notes: null,
    created_at: new Date('2026-07-20T00:00:00.000Z'),
    updated_at: new Date('2026-07-20T00:00:00.000Z'),
    ...overrides,
  } as Appointment;
}

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prisma: {
    appointment: Record<string, jest.Mock>;
    patient: Record<string, jest.Mock>;
    location: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      appointment: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      patient: { findFirst: jest.fn() },
      location: { findFirst: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    service = new AppointmentsService(prisma as unknown as PrismaService);
  });

  const baseDto: CreateAppointmentDto = {
    patient_id: 'patient-1',
    date: '2026-07-20',
    location_type: LocationType.REGISTERED,
    location_id: 'location-1',
  } as CreateAppointmentDto;

  describe('create', () => {
    it('cria um atendimento REGISTERED quando paciente e local pertencem ao usuário', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      prisma.location.findFirst.mockResolvedValue({ id: 'location-1' });
      prisma.appointment.create.mockResolvedValue(buildAppointment());

      const result = await service.create('user-1', baseDto);

      expect(prisma.patient.findFirst).toHaveBeenCalledWith({
        where: { id: 'patient-1', user_id: 'user-1' },
      });
      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user_id: 'user-1',
            patient_id: 'patient-1',
            location_type: LocationType.REGISTERED,
            location_id: 'location-1',
            ad_hoc_location_name: null,
            home_address: null,
          }),
        }),
      );
      expect(result.id).toBe('appt-1');
    });

    it('cria um atendimento AD_HOC limpando location_id e home_address', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      prisma.appointment.create.mockResolvedValue(
        buildAppointment({
          location_type: LocationType.AD_HOC,
          location_id: null,
          ad_hoc_location_name: 'Clínica avulsa',
        }),
      );

      await service.create('user-1', {
        ...baseDto,
        location_type: LocationType.AD_HOC,
        location_id: undefined,
        ad_hoc_location_name: 'Clínica avulsa',
      } as CreateAppointmentDto);

      expect(prisma.location.findFirst).not.toHaveBeenCalled();
      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            location_type: LocationType.AD_HOC,
            location_id: null,
            ad_hoc_location_name: 'Clínica avulsa',
            home_address: null,
          }),
        }),
      );
    });

    it('cria um atendimento HOME_VISIT com home_address opcional', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      prisma.appointment.create.mockResolvedValue(
        buildAppointment({
          location_type: LocationType.HOME_VISIT,
          location_id: null,
          home_address: 'Rua das Flores, 10',
        }),
      );

      await service.create('user-1', {
        ...baseDto,
        location_type: LocationType.HOME_VISIT,
        location_id: undefined,
        home_address: 'Rua das Flores, 10',
      } as CreateAppointmentDto);

      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            location_type: LocationType.HOME_VISIT,
            location_id: null,
            ad_hoc_location_name: null,
            home_address: 'Rua das Flores, 10',
          }),
        }),
      );
    });

    it('lança NotFoundException se o paciente não pertence ao usuário', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);

      await expect(service.create('user-1', baseDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.appointment.create).not.toHaveBeenCalled();
    });

    it('lança UnprocessableEntityException se REGISTERED sem location_id', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });

      await expect(
        service.create('user-1', {
          ...baseDto,
          location_id: undefined,
        } as CreateAppointmentDto),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('lança UnprocessableEntityException se AD_HOC sem ad_hoc_location_name', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });

      await expect(
        service.create('user-1', {
          ...baseDto,
          location_type: LocationType.AD_HOC,
          location_id: undefined,
        } as CreateAppointmentDto),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('lança NotFoundException se o local REGISTERED não pertence ao usuário', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      prisma.location.findFirst.mockResolvedValue(null);

      await expect(service.create('user-1', baseDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.appointment.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('filtra por usuário, paciente, local e intervalo de datas', async () => {
      prisma.appointment.findMany.mockResolvedValue([buildAppointment()]);
      prisma.appointment.count.mockResolvedValue(1);

      const result = await service.findAll('user-1', {
        page: 1,
        per_page: 20,
        patient_id: 'patient-1',
        location_id: 'location-1',
        date_from: '2026-07-01',
        date_to: '2026-07-31',
      });

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            user_id: 'user-1',
            patient_id: 'patient-1',
            location_id: 'location-1',
            date: { gte: new Date('2026-07-01'), lte: new Date('2026-07-31') },
          },
        }),
      );
      expect(result.pagination.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('lança NotFoundException se o atendimento não pertence ao usuário', async () => {
      prisma.appointment.findFirst.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'appt-x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('mantém os campos de local existentes quando não enviados', async () => {
      prisma.appointment.findFirst.mockResolvedValue(buildAppointment());
      prisma.location.findFirst.mockResolvedValue({ id: 'location-1' });
      prisma.appointment.update.mockResolvedValue(
        buildAppointment({ diagnosis: 'Saudável' }),
      );

      const result = await service.update('user-1', 'appt-1', {
        diagnosis: 'Saudável',
      });

      expect(prisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'appt-1' },
          data: expect.objectContaining({
            location_type: LocationType.REGISTERED,
            location_id: 'location-1',
            diagnosis: 'Saudável',
          }),
        }),
      );
      expect(result.diagnosis).toBe('Saudável');
    });

    it('lança NotFoundException se o atendimento não existe', async () => {
      prisma.appointment.findFirst.mockResolvedValue(null);

      await expect(
        service.update('user-1', 'appt-x', { diagnosis: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('remove o atendimento existente', async () => {
      prisma.appointment.findFirst.mockResolvedValue(buildAppointment());
      prisma.appointment.delete.mockResolvedValue(buildAppointment());

      await service.remove('user-1', 'appt-1');

      expect(prisma.appointment.delete).toHaveBeenCalledWith({
        where: { id: 'appt-1' },
      });
    });

    it('lança NotFoundException se o atendimento não pertence ao usuário', async () => {
      prisma.appointment.findFirst.mockResolvedValue(null);

      await expect(service.remove('user-1', 'appt-x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.appointment.delete).not.toHaveBeenCalled();
    });
  });
});
