import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUserDto } from '../modules/users/dto/update-user.dto';
import { UpdateTutorDto } from '../modules/tutors/dto/update-tutor.dto';
import { UpdateLocationDto } from '../modules/locations/dto/update-location.dto';
import { CreatePatientDto } from '../modules/patients/dto/create-patient.dto';
import { UpdatePatientDto } from '../modules/patients/dto/update-patient.dto';
import { UpdateAppointmentDto } from '../modules/appointments/dto/update-appointment.dto';
import { ListAppointmentsQueryDto } from '../modules/appointments/dto/list-appointments-query.dto';
import { CreateVaccineDto } from '../modules/vaccines/dto/create-vaccine.dto';
import { UpdateVaccineDto } from '../modules/vaccines/dto/update-vaccine.dto';

// Valida um objeto como o ValidationPipe global faria e devolve os campos com erro.
async function invalidFields(
  dtoClass: new () => object,
  body: Record<string, unknown>,
): Promise<string[]> {
  const errors = await validate(plainToInstance(dtoClass, body));
  return errors.map((error) => error.property);
}

const TUTOR_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('Validação de DTOs', () => {
  describe('campos obrigatórios não aceitam null em PATCH', () => {
    it.each([
      [UpdateUserDto, 'name'],
      [UpdateUserDto, 'email'],
      [UpdateTutorDto, 'name'],
      [UpdateLocationDto, 'name'],
      [UpdatePatientDto, 'name'],
      [UpdatePatientDto, 'sex'],
      [UpdateAppointmentDto, 'date'],
      [UpdateAppointmentDto, 'location_type'],
      [UpdateVaccineDto, 'name'],
      [UpdateVaccineDto, 'application_date'],
    ] as const)('%p.%s = null é rejeitado', async (dtoClass, field) => {
      const fields = await invalidFields(dtoClass, { [field]: null });
      expect(fields).toEqual([field]);
    });

    it('campo ausente continua opcional', async () => {
      expect(await invalidFields(UpdateAppointmentDto, {})).toEqual([]);
      expect(await invalidFields(UpdateVaccineDto, {})).toEqual([]);
    });

    it('campos anuláveis continuam aceitando null', async () => {
      const fields = await invalidFields(UpdateAppointmentDto, {
        weight_kg: null,
        notes: null,
        home_address: null,
      });
      expect(fields).toEqual([]);
    });

    it('sex = null também é rejeitado no cadastro de paciente', async () => {
      const fields = await invalidFields(CreatePatientDto, {
        tutor_id: TUTOR_ID,
        name: 'Mimi',
        sex: null,
      });
      expect(fields).toEqual(['sex']);
    });
  });

  describe('datas sem hora (YYYY-MM-DD)', () => {
    it('aceita data no formato YYYY-MM-DD', async () => {
      expect(
        await invalidFields(UpdateAppointmentDto, { date: '2024-06-15' }),
      ).toEqual([]);
    });

    it.each([
      ['data com hora', '2024-06-15T10:00:00Z'],
      ['data impossível', '2024-02-30'],
      ['formato brasileiro', '15/06/2024'],
    ])('rejeita %s', async (_caso, value) => {
      expect(await invalidFields(UpdateAppointmentDto, { date: value })).toEqual(
        ['date'],
      );
    });

    it.each([
      [UpdatePatientDto, 'birth_date'],
      [UpdateVaccineDto, 'application_date'],
      [UpdateVaccineDto, 'next_dose_date'],
      [ListAppointmentsQueryDto, 'date_from'],
      [ListAppointmentsQueryDto, 'date_to'],
    ] as const)('%p.%s rejeita data com hora', async (dtoClass, field) => {
      const fields = await invalidFields(dtoClass, {
        [field]: '2024-06-15T10:00:00Z',
      });
      expect(fields).toEqual([field]);
    });
  });

  describe('nome da vacina', () => {
    const PATIENT_ID = '660e8400-e29b-41d4-a716-446655440001';

    it('rejeita nome vazio no cadastro', async () => {
      const fields = await invalidFields(CreateVaccineDto, {
        patient_id: PATIENT_ID,
        name: '',
        application_date: '2024-06-15',
      });
      expect(fields).toEqual(['name']);
    });

    it('rejeita nome vazio na atualização', async () => {
      expect(await invalidFields(UpdateVaccineDto, { name: '' })).toEqual([
        'name',
      ]);
    });
  });
});
