import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Vaccine } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { VaccinesService } from './vaccines.service';
import { CreateVaccineDto } from './dto/create-vaccine.dto';

function buildVaccine(overrides: Partial<Vaccine> = {}): Vaccine {
  return {
    id: 'vaccine-1',
    user_id: 'user-1',
    patient_id: 'patient-1',
    appointment_id: null,
    name: 'V10',
    manufacturer: null,
    batch: null,
    application_date: new Date('2026-07-20T00:00:00.000Z'),
    next_dose_date: null,
    notes: null,
    created_at: new Date('2026-07-20T00:00:00.000Z'),
    updated_at: new Date('2026-07-20T00:00:00.000Z'),
    ...overrides,
  } as Vaccine;
}

describe('VaccinesService', () => {
  let service: VaccinesService;
  let prisma: {
    vaccine: Record<string, jest.Mock>;
    patient: Record<string, jest.Mock>;
    appointment: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      vaccine: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      patient: { findFirst: jest.fn() },
      appointment: { findFirst: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    service = new VaccinesService(prisma as unknown as PrismaService);
  });

  const baseDto: CreateVaccineDto = {
    patient_id: 'patient-1',
    name: 'V10',
    application_date: '2026-07-20',
  } as CreateVaccineDto;

  describe('create', () => {
    it('cria uma vacina quando o paciente pertence ao usuário', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      prisma.vaccine.create.mockResolvedValue(buildVaccine());

      const result = await service.create('user-1', baseDto);

      expect(prisma.patient.findFirst).toHaveBeenCalledWith({
        where: { id: 'patient-1', user_id: 'user-1' },
      });
      expect(prisma.vaccine.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user_id: 'user-1',
            patient_id: 'patient-1',
            name: 'V10',
          }),
        }),
      );
      expect(result.id).toBe('vaccine-1');
    });

    it('lança NotFoundException se o paciente não pertence ao usuário', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);

      await expect(service.create('user-1', baseDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.vaccine.create).not.toHaveBeenCalled();
    });

    it('valida que appointment_id pertence ao mesmo paciente', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      prisma.appointment.findFirst.mockResolvedValue({
        id: 'appt-1',
        patient_id: 'patient-2',
      });

      await expect(
        service.create('user-1', { ...baseDto, appointment_id: 'appt-1' }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(prisma.vaccine.create).not.toHaveBeenCalled();
    });

    it('lança NotFoundException se o atendimento não pertence ao usuário', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      prisma.appointment.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', { ...baseDto, appointment_id: 'appt-x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('cria vacina vinculada a atendimento válido do mesmo paciente', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
      prisma.appointment.findFirst.mockResolvedValue({
        id: 'appt-1',
        patient_id: 'patient-1',
      });
      prisma.vaccine.create.mockResolvedValue(
        buildVaccine({ appointment_id: 'appt-1' }),
      );

      const result = await service.create('user-1', {
        ...baseDto,
        appointment_id: 'appt-1',
      });

      expect(result.appointment_id).toBe('appt-1');
    });
  });

  describe('findAll', () => {
    it('filtra por usuário e paciente', async () => {
      prisma.vaccine.findMany.mockResolvedValue([buildVaccine()]);
      prisma.vaccine.count.mockResolvedValue(1);

      const result = await service.findAll('user-1', {
        page: 1,
        per_page: 20,
        patient_id: 'patient-1',
      });

      expect(prisma.vaccine.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: 'user-1', patient_id: 'patient-1' },
        }),
      );
      expect(result.pagination.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('lança NotFoundException se a vacina não pertence ao usuário', async () => {
      prisma.vaccine.findFirst.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'vaccine-x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('atualiza campos informados', async () => {
      prisma.vaccine.findFirst.mockResolvedValue(buildVaccine());
      prisma.vaccine.update.mockResolvedValue(
        buildVaccine({ notes: 'Sem reação' }),
      );

      const result = await service.update('user-1', 'vaccine-1', {
        notes: 'Sem reação',
      });

      expect(prisma.vaccine.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vaccine-1' },
          data: expect.objectContaining({ notes: 'Sem reação' }),
        }),
      );
      expect(result.notes).toBe('Sem reação');
    });

    it('lança NotFoundException se a vacina não existe', async () => {
      prisma.vaccine.findFirst.mockResolvedValue(null);

      await expect(
        service.update('user-1', 'vaccine-x', { notes: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('valida novo appointment_id contra o paciente existente', async () => {
      prisma.vaccine.findFirst.mockResolvedValue(buildVaccine());
      prisma.appointment.findFirst.mockResolvedValue({
        id: 'appt-1',
        patient_id: 'patient-2',
      });

      await expect(
        service.update('user-1', 'vaccine-1', { appointment_id: 'appt-1' }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(prisma.vaccine.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('remove a vacina existente', async () => {
      prisma.vaccine.findFirst.mockResolvedValue(buildVaccine());
      prisma.vaccine.delete.mockResolvedValue(buildVaccine());

      await service.remove('user-1', 'vaccine-1');

      expect(prisma.vaccine.delete).toHaveBeenCalledWith({
        where: { id: 'vaccine-1' },
      });
    });

    it('lança NotFoundException se a vacina não pertence ao usuário', async () => {
      prisma.vaccine.findFirst.mockResolvedValue(null);

      await expect(service.remove('user-1', 'vaccine-x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.vaccine.delete).not.toHaveBeenCalled();
    });
  });
});
