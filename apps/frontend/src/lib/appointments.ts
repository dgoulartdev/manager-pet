import { LocationType, type AppointmentDto } from '@meupaciente/shared';

/** Onde foi o atendimento: nome do local cadastrado, local avulso ou domicílio. */
export function describeLocation(
  appointment: AppointmentDto,
  locationNames: Map<string, string>,
): string {
  switch (appointment.location_type) {
    case LocationType.REGISTERED:
      return (
        (appointment.location_id && locationNames.get(appointment.location_id)) ||
        'Local cadastrado'
      );
    case LocationType.AD_HOC:
      return appointment.ad_hoc_location_name ?? 'Local avulso';
    case LocationType.HOME_VISIT:
      return 'Atendimento domiciliar';
  }
}

/** Nome curto do atendimento: diagnóstico, senão a queixa principal. */
export function appointmentTitle(appointment: AppointmentDto): string {
  return appointment.diagnosis ?? appointment.chief_complaint ?? 'Atendimento';
}
