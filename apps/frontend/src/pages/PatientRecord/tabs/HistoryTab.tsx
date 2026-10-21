import { useState } from 'react';
import { ArrowLeft, ClipboardList, FileText, Pencil, Plus, Syringe, Trash2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  LocationType,
  type AppointmentDto,
  type DocumentDto,
  type VaccineDto,
} from '@meupaciente/shared';
import { apiRequest } from '../../../lib/api';
import { appointmentTitle, describeLocation } from '../../../lib/appointments';
import { formatDate, formatDayMonth, formatLongDate, formatMonthYear } from '../../../lib/dates';
import { describeDocumentFormat, formatFileSize } from '../../../lib/document';
import { pluralize } from '../../../lib/format';
import { formatWeight } from '../../../lib/weights';
import { Alert } from '../../../components/Alert/Alert';
import { Button, ButtonLink } from '../../../components/Button/Button';
import { Dialog } from '../../../components/Dialog/Dialog';
import { EmptyState } from '../../../components/EmptyState/EmptyState';
import { useToast } from '../../../components/Toast/Toast';
import styles from './HistoryTab.module.css';

interface HistoryTabProps {
  appointments: AppointmentDto[]; // mais recente primeiro (ordem da API)
  locationNames: Map<string, string>;
  // Vacinas e exames do paciente: cada atendimento mostra os vinculados a ele.
  vaccines: VaccineDto[] | undefined;
  documents: DocumentDto[] | undefined;
  patientId: string;
  newAppointmentPath: string;
  // Depois de excluir um atendimento: recarrega a lista (e vacinas/exames, que perdem o vínculo).
  onChanged: () => void;
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

/**
 * Linha do tempo + evolução do atendimento selecionado lado a lado (≥ 1024px):
 * comparar atendimentos sem perder o lugar na lista. No mobile vira navegação
 * em dois passos — a URL guarda o atendimento aberto (?atendimento=).
 */
export function HistoryTab({
  appointments,
  locationNames,
  vaccines,
  documents,
  patientId,
  newAppointmentPath,
  onChanged,
}: HistoryTabProps) {
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
                        <span className={styles.itemTitle}>{appointmentTitle(appointment)}</span>
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
        <AppointmentDetail
          appointment={selected}
          locationNames={locationNames}
          vaccines={vaccines?.filter((vaccine) => vaccine.appointment_id === selected.id)}
          documents={documents?.filter((doc) => doc.appointment_id === selected.id)}
          editPath={`/pacientes/${patientId}/atendimentos/${selected.id}/editar`}
          onDeleted={onChanged}
        />
      </article>
    </div>
  );
}

function AppointmentDetail({
  appointment,
  locationNames,
  vaccines,
  documents,
  editPath,
  onDeleted,
}: {
  appointment: AppointmentDto;
  locationNames: Map<string, string>;
  // Vacinas e exames deste atendimento; indefinido enquanto carregam.
  vaccines: VaccineDto[] | undefined;
  documents: DocumentDto[] | undefined;
  editPath: string;
  onDeleted: () => void;
}) {
  const location = describeLocation(appointment, locationNames);
  const sections = SECTIONS.filter(({ key }) => appointment[key]);

  return (
    <>
      <header className={styles.detailHeader}>
        <div className={styles.detailTop}>
          <h3 id="atendimento-titulo" className={styles.detailTitle}>
            Atendimento de {formatLongDate(appointment.date)}
          </h3>
          <div className={styles.detailActions}>
            <ButtonLink
              to={editPath}
              variant="secondary"
              size="sm"
              icon={<Pencil size={16} strokeWidth={1.75} aria-hidden="true" />}
            >
              Editar
            </ButtonLink>
            <DeleteAppointment
              appointment={appointment}
              linkedVaccines={vaccines?.length ?? 0}
              linkedDocuments={documents?.length ?? 0}
              onDeleted={onDeleted}
            />
          </div>
        </div>
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
        {vaccines && <AppointmentVaccines appointmentId={appointment.id} vaccines={vaccines} />}
        {documents && (
          <AppointmentDocuments appointmentId={appointment.id} documents={documents} />
        )}
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

/**
 * Exclusão de atendimento. As vacinas registradas nele continuam na carteira
 * (a API desfaz só o vínculo — ADR-009); a confirmação avisa isso.
 */
function DeleteAppointment({
  appointment,
  linkedVaccines,
  linkedDocuments,
  onDeleted,
}: {
  appointment: AppointmentDto;
  linkedVaccines: number;
  linkedDocuments: number;
  onDeleted: () => void;
}) {
  const showToast = useToast();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  async function confirm() {
    setDeleting(true);
    setFailed(false);
    try {
      await apiRequest(`/appointments/${appointment.id}`, { method: 'DELETE' });
      setOpen(false);
      showToast({
        tone: 'success',
        title: `Atendimento de ${formatDate(appointment.date)} excluído`,
      });
      onDeleted();
    } catch {
      setFailed(true);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Excluir atendimento"
        icon={<Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />}
        onClick={() => setOpen(true)}
      >
        Excluir
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Excluir o atendimento de ${formatDate(appointment.date)}?`}
        description={[
          'O peso e as anotações deste atendimento serão apagados.',
          linkedVaccines === 1
            ? 'A vacina registrada nele continua na carteira.'
            : linkedVaccines > 1
              ? `As ${pluralize(linkedVaccines, 'vacina registrada', 'vacinas registradas')} nele continuam na carteira.`
              : null,
          linkedDocuments === 1
            ? 'O exame vinculado continua no prontuário.'
            : linkedDocuments > 1
              ? `Os ${pluralize(linkedDocuments, 'exame vinculado', 'exames vinculados')} continuam no prontuário.`
              : null,
          'Não é possível desfazer.',
        ]
          .filter(Boolean)
          .join(' ')}
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
            Excluir atendimento
          </Button>
        </div>
      </Dialog>
    </>
  );
}

/**
 * Vacinas aplicadas no atendimento (vínculo da ADR-009). Cada uma abre a
 * edição na carteira; o atalho registra uma nova já vinculada a este atendimento.
 */
function AppointmentVaccines({
  appointmentId,
  vaccines,
}: {
  appointmentId: string;
  vaccines: VaccineDto[];
}) {
  return (
    <section className={styles.vaccines} aria-labelledby="atendimento-vacinas">
      <h4 id="atendimento-vacinas" className={styles.sectionLabel}>
        Vacinas aplicadas
      </h4>
      <ul className={styles.vaccineList}>
        {vaccines.map((vaccine) => (
          <li key={vaccine.id}>
            <Link to={`?aba=vacinas&vacina=${vaccine.id}`} replace className={styles.vaccineChip}>
              <Syringe size={16} strokeWidth={1.75} aria-hidden="true" />
              {vaccine.name}
              {vaccine.batch && <span className={styles.vaccineBatch}>Lote {vaccine.batch}</span>}
            </Link>
          </li>
        ))}
        <li>
          <Link
            to={`?aba=vacinas&registrar=${appointmentId}`}
            replace
            className={styles.registerVaccine}
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Registrar vacina
          </Link>
        </li>
      </ul>
    </section>
  );
}

/**
 * Exames vinculados ao atendimento. Cada item permite editar na aba Exames;
 * o atalho abre o diálogo de anexo já vinculado a este atendimento.
 */
function AppointmentDocuments({
  appointmentId,
  documents,
}: {
  appointmentId: string;
  documents: DocumentDto[];
}) {
  return (
    <section className={styles.vaccines} aria-labelledby="atendimento-exames">
      <h4 id="atendimento-exames" className={styles.sectionLabel}>
        Exames e documentos
      </h4>
      <ul className={styles.vaccineList}>
        {documents.map((doc) => (
          <li key={doc.id}>
            <Link to={`?aba=exames&exame=${doc.id}`} replace className={styles.vaccineChip}>
              <FileText size={16} strokeWidth={1.75} aria-hidden="true" />
              {doc.name}
              <span className={styles.vaccineBatch}>
                {describeDocumentFormat(doc.mime_type)} · {formatFileSize(doc.size_bytes)}
              </span>
            </Link>
          </li>
        ))}
        <li>
          <Link
            to={`?aba=exames&anexar=${appointmentId}`}
            replace
            className={styles.registerVaccine}
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Anexar exame
          </Link>
        </li>
      </ul>
    </section>
  );
}
