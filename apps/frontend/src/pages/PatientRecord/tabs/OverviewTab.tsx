import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { Sex, type PatientDetailDto } from '@meupaciente/shared';
import { apiRequest } from '../../../lib/api';
import { formatDate } from '../../../lib/dates';
import { formatAge, formatPhone, pluralize } from '../../../lib/format';
import { ACCEPTED_PHOTO_TYPES, preparePhoto } from '../../../lib/photo';
import { Alert } from '../../../components/Alert/Alert';
import { Avatar } from '../../../components/Avatar/Avatar';
import { Button, ButtonLink } from '../../../components/Button/Button';
import { Dialog } from '../../../components/Dialog/Dialog';
import { useToast } from '../../../components/Toast/Toast';
import styles from './OverviewTab.module.css';

const SEX_LABELS: Record<Sex, string> = {
  [Sex.MALE]: 'Macho',
  [Sex.FEMALE]: 'Fêmea',
  [Sex.UNKNOWN]: 'Não informado',
};

interface OverviewTabProps {
  patient: PatientDetailDto;
  appointmentsCount: number | undefined;
  vaccinesCount: number | undefined;
  onPhotoChanged: () => void;
}

export function OverviewTab({
  patient,
  appointmentsCount,
  vaccinesCount,
  onPhotoChanged,
}: OverviewTabProps) {
  const age = formatAge(patient.birth_date);
  const fields: { label: string; value: string | null; data?: boolean; note?: string | null }[] = [
    { label: 'Nome', value: patient.name },
    { label: 'Espécie', value: patient.species },
    { label: 'Sexo', value: SEX_LABELS[patient.sex] },
    { label: 'Raça', value: patient.breed },
    {
      label: 'Nascimento',
      value: patient.birth_date ? formatDate(patient.birth_date) : null,
      data: true,
      note: age,
    },
    { label: 'Pelagem', value: patient.color },
  ];

  return (
    <div className={styles.layout}>
      <section className={styles.card} aria-labelledby="dados-identificacao">
        <div className={styles.cardHeader}>
          <h2 id="dados-identificacao" className={styles.cardTitle}>
            Identificação
          </h2>
          <ButtonLink
            to={`/pacientes/${patient.id}/editar`}
            variant="secondary"
            aria-label={`Editar dados de ${patient.name}`}
            icon={<Pencil size={16} strokeWidth={1.75} aria-hidden="true" />}
          >
            Editar
          </ButtonLink>
        </div>
        <dl className={styles.fields}>
          {fields.map((field) => (
            <div key={field.label} className={styles.field}>
              <dt>{field.label}</dt>
              <dd className={field.data ? styles.data : undefined}>
                {field.value ?? <span className={styles.missing}>Não informado</span>}
                {field.value && field.note && <span className={styles.note}>{field.note}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className={styles.side}>
        <section className={styles.card} aria-labelledby="dados-tutor">
          <h2 id="dados-tutor" className={styles.cardTitle}>
            Tutor
          </h2>
          <div className={styles.tutor}>
            <Avatar name={patient.tutor.name} kind="person" />
            <div className={styles.tutorText}>
              <span className={styles.tutorName}>{patient.tutor.name}</span>
              {patient.tutor.phone && (
                <a href={`tel:${patient.tutor.phone}`} className={styles.contact}>
                  {formatPhone(patient.tutor.phone)}
                </a>
              )}
              {patient.tutor.email && (
                <a href={`mailto:${patient.tutor.email}`} className={styles.contactEmail}>
                  {patient.tutor.email}
                </a>
              )}
            </div>
          </div>
        </section>

        <PhotoCard patient={patient} onChanged={onPhotoChanged} />
      </div>

      <DeletePatient
        patient={patient}
        appointmentsCount={appointmentsCount}
        vaccinesCount={vaccinesCount}
      />
    </div>
  );
}

// Foto do paciente: aqui o envio é imediato (o paciente já existe).
function PhotoCard({ patient, onChanged }: { patient: PatientDetailDto; onChanged: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy('upload');
    setError(null);
    const prepared = await preparePhoto(file);
    if ('error' in prepared) {
      setError(prepared.error);
      setBusy(null);
      return;
    }
    try {
      const body = new FormData();
      body.append('photo', prepared.photo);
      await apiRequest(`/patients/${patient.id}/photo`, { method: 'PUT', body });
      onChanged();
    } catch {
      setError('Não foi possível enviar a foto. Verifique sua conexão e tente de novo.');
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy('remove');
    setError(null);
    try {
      await apiRequest(`/patients/${patient.id}/photo`, { method: 'DELETE' });
      onChanged();
    } catch {
      setError('Não foi possível remover a foto. Tente de novo.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={styles.card} aria-labelledby="dados-foto">
      <h2 id="dados-foto" className={styles.cardTitle}>
        Foto
      </h2>
      <div className={styles.photo}>
        <Avatar name={patient.name} kind="patient" photoUrl={patient.photo_url} size="xl" />
        <div className={styles.photoActions}>
          <Button
            variant="secondary"
            size="sm"
            loading={busy === 'upload'}
            loadingLabel="Enviando…"
            onClick={() => inputRef.current?.click()}
          >
            {patient.photo_url ? 'Trocar foto' : 'Adicionar foto'}
          </Button>
          {patient.photo_url && (
            <Button variant="ghost" size="sm" loading={busy === 'remove'} onClick={remove}>
              Remover
            </Button>
          )}
        </div>
      </div>
      <p
        className={error ? styles.photoError : styles.photoHint}
        role={error ? 'alert' : undefined}
      >
        {error ?? 'JPG ou PNG.'}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_PHOTO_TYPES.join(',')}
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          void upload(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </section>
  );
}

interface DeletePatientProps {
  patient: PatientDetailDto;
  appointmentsCount: number | undefined;
  vaccinesCount: number | undefined;
}

/**
 * Exclusão (DS: destruição é rara e explícita). A confirmação diz a
 * consequência real — a API apaga em cascata atendimentos e vacinas.
 */
function DeletePatient({ patient, appointmentsCount, vaccinesCount }: DeletePatientProps) {
  const navigate = useNavigate();
  const showToast = useToast();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  const consequences = [
    appointmentsCount ? pluralize(appointmentsCount, 'atendimento', 'atendimentos') : null,
    vaccinesCount ? pluralize(vaccinesCount, 'vacina', 'vacinas') : null,
  ].filter(Boolean);
  const description = consequences.length
    ? `Isso apaga também ${consequences.join(' e ')} registrados. Não é possível desfazer.`
    : 'O prontuário será apagado. Não é possível desfazer.';

  async function confirm() {
    setDeleting(true);
    setFailed(false);
    try {
      await apiRequest(`/patients/${patient.id}`, { method: 'DELETE' });
      showToast({ tone: 'success', title: `Prontuário de ${patient.name} excluído` });
      navigate('/pacientes', { replace: true });
    } catch {
      setFailed(true);
      setDeleting(false);
    }
  }

  return (
    <div className={styles.danger}>
      <div>
        <p className={styles.dangerTitle}>Excluir paciente</p>
        <p className={styles.dangerText}>Apaga o prontuário, com atendimentos e vacinas.</p>
      </div>
      <Button
        variant="secondary"
        size="sm"
        className={styles.dangerButton}
        icon={<Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />}
        onClick={() => setOpen(true)}
      >
        Excluir
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Excluir ${patient.name}?`}
        description={description}
      >
        {failed && (
          <Alert tone="error" title="Não foi possível excluir">
            Verifique sua conexão e tente de novo.
          </Alert>
        )}
        <div className={styles.dialogActions}>
          <Button variant="secondary" onClick={() => setOpen(false)} data-autofocus>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            loading={deleting}
            loadingLabel="Excluindo…"
            onClick={confirm}
          >
            Excluir paciente
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
