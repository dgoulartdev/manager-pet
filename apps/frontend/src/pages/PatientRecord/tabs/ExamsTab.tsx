import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ClipboardList,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import type { AppointmentDto, DocumentDto, PatientDetailDto } from '@meupaciente/shared';
import { apiRequest } from '../../../lib/api';
import { formatDate } from '../../../lib/dates';
import {
  describeDocumentFormat,
  describeDocumentType,
  formatFileSize,
} from '../../../lib/document';
import { pluralize } from '../../../lib/format';
import { Button } from '../../../components/Button/Button';
import { DeleteDialog } from '../../../components/DeleteDialog/DeleteDialog';
import { EmptyState } from '../../../components/EmptyState/EmptyState';
import { useToast } from '../../../components/Toast/Toast';
import { ExamDialog } from './ExamDialog';
import styles from './ExamsTab.module.css';

type Editing = null | { appointmentId: string | null } | DocumentDto;

interface ExamsTabProps {
  patient: PatientDetailDto;
  documents: DocumentDto[];
  appointments: AppointmentDto[] | undefined;
  onChanged: () => void;
}

export function ExamsTab({
  patient,
  documents,
  appointments,
  onChanged,
}: ExamsTabProps) {
  const showToast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState<Editing>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const editingDocument = editing && 'id' in editing ? editing : null;

  const examParam = searchParams.get('exame');
  const attachParam = searchParams.get('anexar');

  useEffect(() => {
    if (!examParam && !attachParam) return;
    if (attachParam && !appointments) return;
    if (examParam) {
      const target = documents.find((doc) => doc.id === examParam);
      if (target) setEditing(target);
    } else {
      setEditing({ appointmentId: attachParam });
    }
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete('exame');
        next.delete('anexar');
        return next;
      },
      { replace: true },
    );
  }, [examParam, attachParam, appointments, documents, setSearchParams]);

  function handleSaved(saved: DocumentDto) {
    const created = !editingDocument;
    setEditing(null);
    showToast(
      created
        ? {
            tone: 'success',
            title: `${saved.name} anexado ao prontuário de ${patient.name}`,
          }
        : {
            tone: 'success',
            title: 'Exame atualizado',
            description: saved.name,
          },
    );
    onChanged();
  }

  async function deleteDocument(doc: DocumentDto) {
    await apiRequest(`/documents/${doc.id}`, { method: 'DELETE' });
    setConfirmingDelete(false);
    setEditing(null);
    showToast({
      tone: 'success',
      title: 'Exame excluído',
      description: `${doc.name} de ${formatDate(doc.exam_date)}`,
    });
    onChanged();
  }

  const dialogs = (
    <>
      <ExamDialog
        open={editing !== null}
        patient={patient}
        appointments={appointments ?? []}
        document={editingDocument}
        appointmentId={editing && !('id' in editing) ? editing.appointmentId : null}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
        extraAction={
          editingDocument && (
            <Button
              variant="ghost"
              className={styles.deleteButton}
              icon={<Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />}
              onClick={() => setConfirmingDelete(true)}
            >
              Excluir exame
            </Button>
          )
        }
      />
      {editingDocument && (
        <DeleteDialog
          open={confirmingDelete}
          name={`${editingDocument.name} de ${formatDate(editingDocument.exam_date)}`}
          consequence="O arquivo do exame será apagado do prontuário."
          confirmLabel="Excluir exame"
          onConfirm={() => deleteDocument(editingDocument)}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </>
  );

  const attachButton = (
    <Button
      variant="secondary"
      icon={<Plus size={18} strokeWidth={2} aria-hidden="true" />}
      onClick={() => setEditing({ appointmentId: null })}
    >
      Anexar exame
    </Button>
  );

  if (documents.length === 0) {
    return (
      <>
        <EmptyState
          icon={<FileText size={24} strokeWidth={1.75} />}
          title="Nenhum exame anexado"
          description="Anexe exames laboratoriais, radiografias, ultrassonografias e laudos em PDF, JPG ou PNG."
          action={attachButton}
        />
        {dialogs}
      </>
    );
  }

  const totalBytes = documents.reduce((sum, doc) => sum + doc.size_bytes, 0);
  const summary = [
    pluralize(documents.length, 'exame anexado', 'exames anexados'),
    formatFileSize(totalBytes),
  ];

  const appointmentDates = new Map(
    (appointments ?? []).map((appointment) => [appointment.id, appointment.date]),
  );

  return (
    <div className={styles.tab}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Exames e documentos</h2>
          <p className={styles.summary}>{summary.join(' · ')}</p>
        </div>
        {attachButton}
      </div>

      <div className={styles.table}>
        <div className={styles.columns} aria-hidden="true">
          <span>Exame</span>
          <span>Data</span>
          <span>Arquivo</span>
          <span>Ações</span>
        </div>
        <ul className={styles.list} aria-label="Exames anexados">
          {documents.map((doc) => {
            const appointmentDate = doc.appointment_id
              ? appointmentDates.get(doc.appointment_id)
              : undefined;
            const meta = [describeDocumentType(doc.type), doc.notes]
              .filter(Boolean)
              .join(' · ');

            return (
              <li key={doc.id}>
                <div className={styles.row}>
                  <span className={styles.exam}>
                    <span className={styles.examName}>{doc.name}</span>
                    {meta && <span className={styles.examMeta}>{meta}</span>}
                    {appointmentDate && (
                      <span className={styles.appointment}>
                        <ClipboardList
                          size={16}
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                        Atendimento de {formatDate(appointmentDate)}
                      </span>
                    )}
                  </span>
                  <span className={styles.date}>
                    <span className={styles.mobileLabel}>Data </span>
                    {formatDate(doc.exam_date)}
                  </span>
                  <span className={styles.format}>
                    {describeDocumentFormat(doc.mime_type)} ·{' '}
                    {formatFileSize(doc.size_bytes)}
                  </span>
                  <span className={styles.rowActions}>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.openLink}
                      aria-label={`Abrir ${doc.name}`}
                    >
                      Abrir
                      <ExternalLink
                        size={14}
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Editar ${doc.name}`}
                      icon={
                        <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
                      }
                      onClick={() => setEditing(doc)}
                    >
                      Editar
                    </Button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      {dialogs}
    </div>
  );
}
