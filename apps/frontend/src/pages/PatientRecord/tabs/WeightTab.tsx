import { Plus, Weight } from 'lucide-react';
import type { AppointmentDto } from '@meupaciente/shared';
import { daysBetween, formatDate, parseDateOnly } from '../../../lib/dates';
import { pluralize } from '../../../lib/format';
import {
  formatPercentChange,
  formatWeight,
  formatWeightChange,
  weighings,
} from '../../../lib/weights';
import { ButtonLink } from '../../../components/Button/Button';
import { EmptyState } from '../../../components/EmptyState/EmptyState';
import { WeightChart } from './WeightChart';
import styles from './WeightTab.module.css';

interface WeightTabProps {
  appointments: AppointmentDto[];
  newAppointmentPath: string;
}

function describeSpan(firstDate: string, lastDate: string): string {
  const days = daysBetween(parseDateOnly(firstDate), parseDateOnly(lastDate));
  if (days < 60) return `em ${pluralize(Math.max(days, 1), 'dia', 'dias')}`;
  const months = Math.round(days / 30);
  if (months < 24) return `em ${pluralize(months, 'mês', 'meses')}`;
  return `em ${pluralize(Math.round(days / 365), 'ano', 'anos')}`;
}

/**
 * Pesagens são uma leitura dos atendimentos, não um cadastro à parte: o peso
 * é gravado no atendimento e a série é montada daqui (evita duas fontes de verdade).
 */
export function WeightTab({ appointments, newAppointmentPath }: WeightTabProps) {
  const series = weighings(appointments);

  if (series.length === 0) {
    return (
      <EmptyState
        icon={<Weight size={24} strokeWidth={1.75} />}
        title="Nenhuma pesagem ainda"
        description="O peso é registrado em cada atendimento e aparece aqui como curva."
        action={
          <ButtonLink
            to={newAppointmentPath}
            icon={<Plus size={18} strokeWidth={2} aria-hidden="true" />}
          >
            Registrar atendimento
          </ButtonLink>
        }
      />
    );
  }

  const first = series[0];
  const last = series[series.length - 1];
  const summary =
    series.length === 1
      ? `1 pesagem em ${formatDate(first.date)}`
      : `${pluralize(series.length, 'pesagem', 'pesagens')} ${describeSpan(first.date, last.date)}`;
  const newestFirst = [...series].reverse();

  return (
    <div className={styles.tab}>
      <div>
        <h2 className={styles.title}>Curva de peso</h2>
        <p className={styles.summary}>{summary}</p>
      </div>

      <div className={styles.chartCard}>
        {series.length >= 2 ? (
          <WeightChart data={series} />
        ) : (
          <p className={styles.single}>
            A curva aparece a partir da segunda pesagem. Por enquanto:{' '}
            <strong>{formatWeight(first.weight)}</strong> em {formatDate(first.date)}.
          </p>
        )}
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <caption className="visually-hidden">
            Pesagens, da mais recente para a mais antiga
          </caption>
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col" className={styles.numeric}>
                Peso
              </th>
              <th scope="col" className={styles.numeric}>
                Variação
              </th>
            </tr>
          </thead>
          <tbody>
            {newestFirst.map((point, index) => {
              const previous = newestFirst[index + 1];
              const delta = previous ? point.weight - previous.weight : null;
              return (
                <tr key={point.appointmentId}>
                  <td className={styles.data}>{formatDate(point.date)}</td>
                  <td className={`${styles.data} ${styles.numeric}`}>
                    {formatWeight(point.weight)}
                  </td>
                  <td className={`${styles.data} ${styles.numeric} ${styles.delta}`}>
                    {delta === null
                      ? '—'
                      : `${formatWeightChange(delta)} · ${formatPercentChange(delta, previous.weight)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
