import { useState } from 'react';
import { Plus, Syringe } from 'lucide-react';
import type { PatientDetailDto } from '@meupaciente/shared';
import { formatDate } from '../../../lib/dates';
import { pluralize } from '../../../lib/format';
import {
  describeVaccineStatus,
  nextDose,
  type VaccineStatus,
  type VaccineWithStatus,
} from '../../../lib/vaccines';
import { Badge, type BadgeTone } from '../../../components/Badge/Badge';
import { Button } from '../../../components/Button/Button';
import { EmptyState } from '../../../components/EmptyState/EmptyState';
import { VaccineDialog } from './VaccineDialog';
import styles from './VaccinesTab.module.css';

const STATUS_TONES: Record<VaccineStatus, BadgeTone> = {
  overdue: 'error',
  'due-soon': 'warning',
  'up-to-date': 'success',
  'no-next-dose': 'neutral',
  superseded: 'neutral',
};

interface VaccinesTabProps {
  patient: PatientDetailDto;
  vaccines: VaccineWithStatus[]; // aplicação mais recente primeiro (ordem da API)
  onCreated: () => void;
}

export function VaccinesTab({ patient, vaccines, onCreated }: VaccinesTabProps) {
  const [registering, setRegistering] = useState(false);

  const dialog = (
    <VaccineDialog
      open={registering}
      patient={patient}
      onClose={() => setRegistering(false)}
      onCreated={() => {
        setRegistering(false);
        onCreated();
      }}
    />
  );
  const registerButton = (
    <Button
      variant="secondary"
      icon={<Plus size={18} strokeWidth={2} aria-hidden="true" />}
      onClick={() => setRegistering(true)}
    >
      Registrar vacina
    </Button>
  );

  if (vaccines.length === 0) {
    return (
      <>
        <EmptyState
          icon={<Syringe size={24} strokeWidth={1.75} />}
          title="Nenhuma vacina registrada"
          description="Registre as doses aplicadas — inclusive as de outras clínicas — para acompanhar os reforços."
          action={registerButton}
        />
        {dialog}
      </>
    );
  }

  const overdue = vaccines.filter((vaccine) => vaccine.status === 'overdue').length;
  const upcoming = nextDose(vaccines.filter((vaccine) => vaccine.status !== 'overdue'));
  const summary = [
    pluralize(vaccines.length, 'registro', 'registros'),
    overdue ? pluralize(overdue, 'dose em atraso', 'doses em atraso') : null,
    upcoming?.next_dose_date ? `próximo reforço em ${formatDate(upcoming.next_dose_date)}` : null,
  ].filter(Boolean);

  return (
    <div className={styles.tab}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Carteira de vacinação</h2>
          <p className={styles.summary}>{summary.join(' · ')}</p>
        </div>
        {registerButton}
      </div>

      <div className={styles.table}>
        <div className={styles.columns} aria-hidden="true">
          <span>Vacina</span>
          <span>Aplicação</span>
          <span>Próxima dose</span>
          <span>Situação</span>
        </div>
        <ul className={styles.list} aria-label="Vacinas aplicadas">
          {vaccines.map((vaccine) => {
            const details = [vaccine.manufacturer, vaccine.batch ? `Lote ${vaccine.batch}` : null]
              .filter(Boolean)
              .join(' · ');
            return (
              <li
                key={vaccine.id}
                className={styles.row}
                data-superseded={vaccine.status === 'superseded' || undefined}
              >
                <span className={styles.vaccine}>
                  <span className={styles.vaccineName}>{vaccine.name}</span>
                  {details && <span className={styles.vaccineMeta}>{details}</span>}
                </span>
                <span className={styles.date}>
                  <span className={styles.mobileLabel}>Aplicação </span>
                  {formatDate(vaccine.application_date)}
                </span>
                <span className={styles.date}>
                  <span className={styles.mobileLabel}>Próxima dose </span>
                  {vaccine.next_dose_date ? formatDate(vaccine.next_dose_date) : '—'}
                </span>
                <span className={styles.status}>
                  <Badge tone={STATUS_TONES[vaccine.status]}>
                    {describeVaccineStatus(vaccine)}
                  </Badge>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      {dialog}
    </div>
  );
}
