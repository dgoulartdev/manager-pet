import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUserDto } from '../modules/users/dto/update-user.dto';
import { UpdateTutorDto } from '../modules/tutors/dto/update-tutor.dto';
import { UpdateLocationDto } from '../modules/locations/dto/update-location.dto';
import { CreatePatientDto } from '../modules/patients/dto/create-patient.dto';
import { UpdatePatientDto } from '../modules/patients/dto/update-patient.dto';
import { UpdateAppointmentDto } from '../modules/appointments/dto/update-appointment.dto';
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
});
