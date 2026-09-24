import type { AppointmentDto } from '@meupaciente/shared';

export interface Weighing {
  date: string; // YYYY-MM-DD
  weight: number;
  appointmentId: string;
}

/**
 * Série de peso montada dos atendimentos (a pesagem não é um cadastro à parte:
 * o peso é registrado no atendimento). Ordem cronológica, sem os nulos.
 */
export function weighings(appointments: AppointmentDto[]): Weighing[] {
  return appointments
    .filter((appointment) => appointment.weight_kg !== null)
    .map((appointment) => ({
      date: appointment.date,
      weight: appointment.weight_kg as number,
      appointmentId: appointment.id,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

const weightFormat = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

/** "4,4 kg" */
export function formatWeight(kg: number): string {
  return `${weightFormat.format(kg)} kg`;
}

/** "+0,3 kg" / "−0,1 kg" / "sem variação" (sinal de menos tipográfico). */
export function formatWeightChange(deltaKg: number): string {
  const rounded = Math.round(deltaKg * 100) / 100;
  if (rounded === 0) return 'sem variação';
  const sign = rounded > 0 ? '+' : '−';
  return `${sign}${weightFormat.format(Math.abs(rounded))} kg`;
}

/** "+7,1%" / "−2,2%" */
export function formatPercentChange(delta: number, base: number): string {
  const percent = Math.round((delta / base) * 1000) / 10;
  if (percent === 0) return '0%';
  const sign = percent > 0 ? '+' : '−';
  return `${sign}${Math.abs(percent).toLocaleString('pt-BR')}%`;
}
