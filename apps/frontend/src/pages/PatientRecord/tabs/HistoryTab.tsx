import { ArrowLeft, ClipboardList, Plus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { LocationType, type AppointmentDto } from '@meupaciente/shared';
import { formatDayMonth, formatLongDate, formatMonthYear } from '../../../lib/dates';
import { formatWeight } from '../../../lib/weights';
import { ButtonLink } from '../../../components/Button/Button';
import { EmptyState } from '../../../components/EmptyState/EmptyState';
import styles from './HistoryTab.module.css';

interface HistoryTabProps {
  appointments: AppointmentDto[]; // mais recente primeiro (ordem da API)
  locationNames: Map<string, string>;
  newAppointmentPath: string;
}

// Seções da evolução, na ordem do atendimento. Campo vazio não aparece.
const SECTIONS: { key: keyof AppointmentDto; label: string }[] = [
  { key: 'chief_complaint', label: 'Queixa principal' },
  { key: 'history', label: 'Anamnese' },
  { key: 'diagnosis', label: 'Diagnóstico' },
  { key: 'treatment', label: 'Tratamento' },
  { key: 'prescription', label: 'Prescrição' },
  { key: 'notes', label: 'Observações' },
];

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

function titleOf(appointment: AppointmentDto): string {
  return appointment.diagnosis ?? appointment.chief_complaint ?? 'Atendimento';
}

/**
 * Linha do tempo + evolução do atendimento selecionado lado a lado (≥ 1024px):
 * comparar atendimentos sem perder o lugar na lista. No mobile vira navegação
 * em dois passos — a URL guarda o atendimento aberto (?atendimento=).
 */
export function HistoryTab({ appointments, locationNames, newAppointmentPath }: HistoryTabProps) {
  const [searchParams] = useSearchParams();
  const openedId = searchParams.get('atendimento');

  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList size={24} strokeWidth={1.75} />}
        title="Nenhum atendimento ainda"
        description="O histórico começa no primeiro atendimento. Peso e evolução entram junto."
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

  const selected =
    appointments.find((appointment) => appointment.id === openedId) ?? appointments[0];
  const linkTo = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('atendimento', id);
    return `?${next}`;
  };
  const backToList = (() => {
    const next = new URLSearchParams(searchParams);
    next.delete('atendimento');
    return `?${next}`;
  })();

  // Agrupa por mês, mantendo a ordem (mais recente primeiro).
  const groups: { month: string; items: AppointmentDto[] }[] = [];
  for (const appointment of appointments) {
    const month = formatMonthYear(appointment.date);
    const last = groups.at(-1);
    if (last?.month === month) last.items.push(appointment);
    else groups.push({ month, items: [appointment] });
  }

  return (
    <div className={styles.layout} data-detail-open={openedId ? true : undefined}>
      <nav className={styles.timeline} aria-label="Atendimentos">
        {groups.map((group) => (
          <div key={group.month} className={styles.group}>
            <h3 className={styles.month}>{group.month}</h3>
            <ol className={styles.items}>
              {group.items.map((appointment) => {
                const meta = [
                  appointment.weight_kg !== null ? formatWeight(appointment.weight_kg) : null,
                  describeLocation(appointment, locationNames),
                ].filter(Boolean);
                return (
                  <li key={appointment.id}>
                    <Link
                      to={linkTo(appointment.id)}
                      replace
                      className={styles.item}
                      aria-current={appointment.id === selected.id ? 'true' : undefined}
                    >
                      <span className={styles.date}>{formatDayMonth(appointment.date)}</span>
                      <span className={styles.itemText}>
                        <span className={styles.itemTitle}>{titleOf(appointment)}</span>
                        <span className={styles.itemMeta}>{meta.join(' · ')}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </nav>

      <article className={styles.detail} aria-labelledby="atendimento-titulo">
        <Link to={backToList} replace className={styles.back}>
          <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
          Voltar para o histórico
        </Link>
        <AppointmentDetail appointment={selected} locationNames={locationNames} />
      </article>
    </div>
  );
}

function AppointmentDetail({
  appointment,
  locationNames,
}: {
  appointment: AppointmentDto;
  locationNames: Map<string, string>;
}) {
  const location = describeLocation(appointment, locationNames);
  const sections = SECTIONS.filter(({ key }) => appointment[key]);

  return (
    <>
      <header className={styles.detailHeader}>
        <h3 id="atendimento-titulo" className={styles.detailTitle}>
          Atendimento de {formatLongDate(appointment.date)}
        </h3>
        <dl className={styles.facts}>
          <div>
            <dt>Local</dt>
            <dd>
              {location}
              {appointment.location_type === LocationType.HOME_VISIT &&
                appointment.home_address && (
                  <span className={styles.address}>{appointment.home_address}</span>
                )}
            </dd>
          </div>
          <div>
            <dt>Peso</dt>
            <dd className={styles.data}>
              {appointment.weight_kg !== null ? formatWeight(appointment.weight_kg) : 'Não medido'}
            </dd>
          </div>
        </dl>
      </header>

      {sections.length === 0 ? (
        <p className={styles.noNotes}>Nenhuma anotação clínica neste atendimento.</p>
      ) : (
        <div className={styles.sections}>
          {sections.map(({ key, label }) => (
            <section
              key={key}
              className={key === 'prescription' ? styles.prescription : styles.section}
              aria-label={label}
            >
              <h4 className={styles.sectionLabel}>{label}</h4>
              <p className={styles.sectionText}>{appointment[key] as string}</p>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
