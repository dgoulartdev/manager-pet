import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Pencil, Plus, Syringe, Trash2 } from 'lucide-react';
import type { AppointmentDto, PatientDetailDto, VaccineDto } from '@meupaciente/shared';
import { apiRequest } from '../../../lib/api';
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
import { DeleteDialog } from '../../../components/DeleteDialog/DeleteDialog';
import { EmptyState } from '../../../components/EmptyState/EmptyState';
import { useToast } from '../../../components/Toast/Toast';
import { VaccineDialog } from './VaccineDialog';
import styles from './VaccinesTab.module.css';

const STATUS_TONES: Record<VaccineStatus, BadgeTone> = {
  overdue: 'error',
  'due-soon': 'warning',
  'up-to-date': 'success',
  'no-next-dose': 'neutral',
  superseded: 'neutral',
};

// Nenhum diálogo · registro (talvez já vinculado a um atendimento) · edição.
type Editing = null | { appointmentId: string | null } | VaccineWithStatus;

interface VaccinesTabProps {
  patient: PatientDetailDto;
  vaccines: VaccineWithStatus[]; // aplicação mais recente primeiro (ordem da API)
  // Atendimentos do paciente; indefinido enquanto carregam.
  appointments: AppointmentDto[] | undefined;
  onChanged: () => void;
}

export function VaccinesTab({ patient, vaccines, appointments, onChanged }: VaccinesTabProps) {
  const showToast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState<Editing>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const editingVaccine = editing && 'id' in editing ? editing : null;

  // Vindo do histórico: ?vacina=<id> abre a edição; ?registrar=<atendimento>
  // abre o registro já vinculado. O parâmetro sai da URL depois de usado.
  const vaccineParam = searchParams.get('vacina');
  const registerParam = searchParams.get('registrar');
  useEffect(() => {
    if (!vaccineParam && !registerParam) return;
    if (registerParam && !appointments) return; // espera os atendimentos para vincular
    if (vaccineParam) {
      const target = vaccines.find((vaccine) => vaccine.id === vaccineParam);
      if (target) setEditing(target);
    } else {
      setEditing({ appointmentId: registerParam });
    }
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete('vacina');
        next.delete('registrar');
        return next;
      },
      { replace: true },
    );
  }, [vaccineParam, registerParam, appointments, vaccines, setSearchParams]);

  function handleSaved(saved: VaccineDto) {
    const created = !editingVaccine;
    setEditing(null);
    showToast(
      created
        ? { tone: 'success', title: `${saved.name} registrada na carteira de ${patient.name}` }
        : { tone: 'success', title: 'Vacina atualizada', description: saved.name },
    );
    onChanged();
  }

  async function deleteVaccine(vaccine: VaccineWithStatus) {
    await apiRequest(`/vaccines/${vaccine.id}`, { method: 'DELETE' });
    setConfirmingDelete(false);
    setEditing(null);
    showToast({
      tone: 'success',
      title: 'Vacina excluída',
      description: `${vaccine.name} de ${formatDate(vaccine.application_date)}`,
    });
    onChanged();
  }

  const dialogs = (
    <>
      <VaccineDialog
        open={editing !== null}
        patient={patient}
        appointments={appointments ?? []}
        vaccine={editingVaccine}
        appointmentId={editing && !('id' in editing) ? editing.appointmentId : null}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
        extraAction={
          editingVaccine && (
            <Button
              variant="ghost"
              className={styles.deleteButton}
              icon={<Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />}
              onClick={() => setConfirmingDelete(true)}
            >
              Excluir vacina
            </Button>
          )
        }
      />
      {editingVaccine && (
        <DeleteDialog
          open={confirmingDelete}
          name={`${editingVaccine.name} de ${formatDate(editingVaccine.application_date)}`}
          consequence="O registro sai da carteira de vacinação."
          confirmLabel="Excluir vacina"
          onConfirm={() => deleteVaccine(editingVaccine)}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </>
  );
  const registerButton = (
    <Button
      variant="secondary"
      icon={<Plus size={18} strokeWidth={2} aria-hidden="true" />}
      onClick={() => setEditing({ appointmentId: null })}
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
        {dialogs}
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
  const appointmentDates = new Map(
    (appointments ?? []).map((appointment) => [appointment.id, appointment.date]),
  );

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
          {vaccines.map((vaccine) => (
            <li key={vaccine.id}>
              <VaccineRow
                vaccine={vaccine}
                appointmentDate={
                  vaccine.appointment_id ? appointmentDates.get(vaccine.appointment_id) : undefined
                }
                onOpen={() => setEditing(vaccine)}
              />
            </li>
          ))}
        </ul>
      </div>
      {dialogs}
    </div>
  );
}

interface VaccineRowProps {
  vaccine: VaccineWithStatus;
  // Data do atendimento em que a dose foi aplicada, se houver vínculo.
  appointmentDate: string | undefined;
  onOpen: () => void;
}

function VaccineRow({ vaccine, appointmentDate, onOpen }: VaccineRowProps) {
  const details = [vaccine.manufacturer, vaccine.batch ? `Lote ${vaccine.batch}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      className={styles.row}
      aria-haspopup="dialog"
      data-superseded={vaccine.status === 'superseded' || undefined}
      onClick={onOpen}
    >
      <span className={styles.vaccine}>
        <span className={styles.vaccineName}>
          <span className="visually-hidden">Editar </span>
          {vaccine.name}
        </span>
        {details && <span className={styles.vaccineMeta}>{details}</span>}
        {appointmentDate && (
          <span className={styles.appointment}>
            <ClipboardList size={16} strokeWidth={1.75} aria-hidden="true" />
            Atendimento de {formatDate(appointmentDate)}
          </span>
        )}
      </span>
      <span className={`${styles.date} ${styles.applied}`}>
        <span className={styles.mobileLabel}>Aplicação </span>
        {formatDate(vaccine.application_date)}
      </span>
      <span className={`${styles.date} ${styles.next}`}>
        <span className={styles.mobileLabel}>Próxima dose </span>
        {vaccine.next_dose_date ? formatDate(vaccine.next_dose_date) : '—'}
      </span>
      <span className={styles.status}>
        <Badge tone={STATUS_TONES[vaccine.status]}>{describeVaccineStatus(vaccine)}</Badge>
      </span>
      <Pencil className={styles.editIcon} size={18} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
