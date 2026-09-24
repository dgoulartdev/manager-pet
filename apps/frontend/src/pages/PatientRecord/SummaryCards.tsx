import type { AppointmentDto } from '@meupaciente/shared';
import { formatDate, formatDaysAgo } from '../../lib/dates';
import { formatWeight, formatWeightChange, weighings } from '../../lib/weights';
import { describeVaccineStatus, nextDose, type VaccineWithStatus } from '../../lib/vaccines';
import styles from './SummaryCards.module.css';

interface SummaryCardsProps {
  // undefined = ainda carregando
  appointments: AppointmentDto[] | undefined;
  vaccines: VaccineWithStatus[] | undefined;
  onOpenTab: (tab: 'historico' | 'vacinas' | 'pesagens') => void;
}

/**
 * Respostas rápidas de plantão sem abrir aba: quanto pesa, quando foi o último
 * atendimento e qual a próxima vacina. Cada card leva à aba com o detalhe.
 */
export function SummaryCards({ appointments, vaccines, onOpenTab }: SummaryCardsProps) {
  const series = appointments ? weighings(appointments) : [];
  const latestWeight = series.at(-1);
  const previousWeight = series.at(-2);
  const lastAppointment = appointments?.[0];
  const upcoming = vaccines ? nextDose(vaccines) : null;

  return (
    <div className={styles.cards}>
      <button type="button" className={styles.card} onClick={() => onOpenTab('pesagens')}>
        <span className={styles.label}>Peso atual</span>
        {!appointments ? (
          <span className={styles.loading} />
        ) : latestWeight ? (
          <>
            <span className={styles.value}>
              <span className={styles.number}>{formatWeight(latestWeight.weight)}</span>
              {previousWeight && (
                <span className={styles.change}>
                  {formatWeightChange(latestWeight.weight - previousWeight.weight)}
                </span>
              )}
            </span>
            <span className={styles.meta}>Medido em {formatDate(latestWeight.date)}</span>
          </>
        ) : (
          <>
            <span className={styles.empty}>Sem pesagem</span>
            <span className={styles.meta}>O peso entra pelo atendimento</span>
          </>
        )}
      </button>

      <button type="button" className={styles.card} onClick={() => onOpenTab('historico')}>
        <span className={styles.label}>Último atendimento</span>
        {!appointments ? (
          <span className={styles.loading} />
        ) : lastAppointment ? (
          <>
            <span className={styles.value}>{formatDaysAgo(lastAppointment.date)}</span>
            <span className={styles.meta}>
              {lastAppointment.diagnosis ??
                lastAppointment.chief_complaint ??
                formatDate(lastAppointment.date)}
            </span>
          </>
        ) : (
          <>
            <span className={styles.empty}>Nenhum ainda</span>
            <span className={styles.meta}>O histórico começa no primeiro</span>
          </>
        )}
      </button>

      <button type="button" className={styles.card} onClick={() => onOpenTab('vacinas')}>
        <span className={styles.label}>Próxima vacina</span>
        {!vaccines ? (
          <span className={styles.loading} />
        ) : upcoming ? (
          <>
            <span className={styles.value} data-status={upcoming.status}>
              {upcoming.name}
            </span>
            <span className={styles.meta} data-status={upcoming.status}>
              {formatDate(upcoming.next_dose_date!)} ·{' '}
              {describeVaccineStatus(upcoming).toLowerCase()}
            </span>
          </>
        ) : (
          <>
            <span className={styles.empty}>Nenhuma prevista</span>
            <span className={styles.meta}>
              {vaccines.length ? 'Sem próxima dose registrada' : 'Nenhuma vacina registrada'}
            </span>
          </>
        )}
      </button>
    </div>
  );
}
