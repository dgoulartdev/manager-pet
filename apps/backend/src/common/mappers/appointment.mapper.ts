import { Appointment, Location, Patient } from '@prisma/client';
import type { AppointmentDetailDto, AppointmentDto } from '@felino/shared';
import { LocationType } from '@felino/shared';
import { toPatientDto } from './patient.mapper';
import { toLocationDto } from './location.mapper';

export function toAppointmentDto(appointment: Appointment): AppointmentDto {
  return {
    id: appointment.id,
    patient_id: appointment.patient_id,
    date: appointment.date.toISOString().slice(0, 10),
    location_type: appointment.location_type as LocationType,
    location_id: appointment.location_id,
    ad_hoc_location_name: appointment.ad_hoc_location_name,
    home_address: appointment.home_address,
    weight_kg: appointment.weight_kg ? Number(appointment.weight_kg) : null,
    chief_complaint: appointment.chief_complaint,
    history: appointment.history,
    diagnosis: appointment.diagnosis,
    treatment: appointment.treatment,
    prescription: appointment.prescription,
    notes: appointment.notes,
    created_at: appointment.created_at.toISOString(),
    updated_at: appointment.updated_at.toISOString(),
  };
}

export function toAppointmentDetailDto(
  appointment: Appointment & { patient: Patient; location: Location | null },
): AppointmentDetailDto {
  return {
    ...toAppointmentDto(appointment),
    patient: toPatientDto(appointment.patient),
    location: appointment.location ? toLocationDto(appointment.location) : null,
  };
}
