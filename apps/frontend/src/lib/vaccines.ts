import type { VaccineDto } from '@meupaciente/shared';
import type { BadgeTone } from '../components/Badge/Badge';
import { daysBetween, formatDuration, parseDateOnly, todayDateOnly } from './dates';

/** Dose a vencer: próxima dose em até 30 dias. */
export const DUE_SOON_DAYS = 30;

export type VaccineStatus = 'overdue' | 'due-soon' | 'up-to-date' | 'no-next-dose' | 'superseded';

export interface VaccineWithStatus extends VaccineDto {
  status: VaccineStatus;
  // Dias até a próxima dose (negativo = atrasada). Nulo se não há próxima dose.
  daysToNextDose: number | null;
}

/**
 * Situação de cada registro. Só a aplicação mais recente de cada vacina (pelo
 * nome) define a situação; as anteriores viram histórico ("superseded"). Sem
 * isso, a 1ª dose de uma vacina já reforçada apareceria como atrasada.
 * Mesma regra do `latest_only` da API: no mesmo dia, vale a registrada por último.
 */
export function withVaccineStatus(
  vaccines: VaccineDto[],
  today = todayDateOnly(),
): VaccineWithStatus[] {
  const latestByName = new Map<string, VaccineDto>();
  for (const vaccine of vaccines) {
    const key = vaccine.name.trim().toLowerCase();
    const current = latestByName.get(key);
    const isNewer =
      !current ||
      vaccine.application_date > current.application_date ||
      (vaccine.application_date === current.application_date &&
        vaccine.created_at > current.created_at);
    if (isNewer) latestByName.set(key, vaccine);
  }

  return vaccines.map((vaccine) => {
    const isLatest = latestByName.get(vaccine.name.trim().toLowerCase())?.id === vaccine.id;
    return isLatest
      ? withCurrentDoseStatus(vaccine, today)
      : { ...vaccine, status: 'superseded', daysToNextDose: null };
  });
}

/**
 * Situação de uma dose que já se sabe ser a mais recente da vacina (ex.: vinda
 * de GET /vaccines?latest_only=true): depende só da próxima dose prevista.
 */
export function withCurrentDoseStatus<T extends VaccineDto>(
  vaccine: T,
  today = todayDateOnly(),
): T & Pick<VaccineWithStatus, 'status' | 'daysToNextDose'> {
  const daysToNextDose = vaccine.next_dose_date
    ? daysBetween(today, parseDateOnly(vaccine.next_dose_date))
    : null;

  let status: VaccineStatus;
  if (daysToNextDose === null) status = 'no-next-dose';
  else if (daysToNextDose < 0) status = 'overdue';
  else if (daysToNextDose <= DUE_SOON_DAYS) status = 'due-soon';
  else status = 'up-to-date';

  return { ...vaccine, status, daysToNextDose };
}

/** Tom do selo de situação (o texto vem de `describeVaccineStatus`). */
export const VACCINE_STATUS_TONES: Record<VaccineStatus, BadgeTone> = {
  overdue: 'error',
  'due-soon': 'warning',
  'up-to-date': 'success',
  'no-next-dose': 'neutral',
  superseded: 'neutral',
};

const STATUS_PRIORITY: VaccineStatus[] = ['overdue', 'due-soon', 'up-to-date'];

/** Pior situação da carteira: é o que aparece no cabeçalho do paciente. */
export function worstVaccineStatus(vaccines: VaccineWithStatus[]): VaccineStatus | null {
  return (
    STATUS_PRIORITY.find((status) => vaccines.some((vaccine) => vaccine.status === status)) ?? null
  );
}

/** Próxima dose prevista entre as vacinas que ainda contam (a mais próxima, inclusive atrasada). */
export function nextDose(vaccines: VaccineWithStatus[]): VaccineWithStatus | null {
  return (
    vaccines
      .filter((vaccine) => vaccine.daysToNextDose !== null && vaccine.status !== 'superseded')
      .sort((a, b) => (a.daysToNextDose ?? 0) - (b.daysToNextDose ?? 0))[0] ?? null
  );
}

/** Texto da situação — a cor nunca é o único sinal (DS). */
export function describeVaccineStatus(vaccine: VaccineWithStatus): string {
  const days = vaccine.daysToNextDose;
  switch (vaccine.status) {
    case 'overdue':
      return `Atrasada há ${formatDuration(days ?? 0)}`;
    case 'due-soon':
      if (days === 0) return 'Vence hoje';
      return days === 1 ? 'Vence amanhã' : `Vence em ${days} dias`;
    case 'up-to-date':
      return 'Em dia';
    case 'no-next-dose':
      return 'Sem próxima dose';
    case 'superseded':
      return 'Dose anterior';
  }
}
