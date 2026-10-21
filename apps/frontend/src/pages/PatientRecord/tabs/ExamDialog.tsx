import {
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, FileUp } from 'lucide-react';
import type { AppointmentDto, DocumentDto, PatientDetailDto } from '@meupaciente/shared';
import { ApiError, apiRequest } from '../../../lib/api';
import { appointmentTitle } from '../../../lib/appointments';
import { formatDate, todayIso } from '../../../lib/dates';
import {
  ACCEPTED_DOCUMENT_MIME_TYPES,
  compressExamFileIfNeeded,
  defaultDocumentNameFromFilename,
  describeDocumentFormat,
  DOCUMENT_TYPE_OPTIONS,
  formatFileSize,
} from '../../../lib/document';
import { describeCommonError, type FormMessage } from '../../../lib/errors';
import { Alert } from '../../../components/Alert/Alert';
import { Button } from '../../../components/Button/Button';
import { Dialog } from '../../../components/Dialog/Dialog';
import { Select } from '../../../components/Select/Select';
import { Textarea } from '../../../components/Textarea/Textarea';
import { TextField } from '../../../components/TextField/TextField';
import styles from './ExamDialog.module.css';

interface ExamDialogProps {
  open: boolean;
  patient: PatientDetailDto;
  appointments: AppointmentDto[];
  document?: DocumentDto | null;
  appointmentId?: string | null;
  onClose: () => void;
  onSaved: (document: DocumentDto) => void;
  extraAction?: ReactNode;
}

interface Values {
  name: string;
  type: string;
  examDate: string;
  appointmentId: string;
  notes: string;
}

interface FieldErrors {
  file?: string;
  name?: string;
  examDate?: string;
}

interface PreparedFileInfo {
  file: File;
  wasCompressed: boolean;
  originalSize: number;
  finalSize: number;
}

function appointmentOn(date: string, appointments: AppointmentDto[]): string {
  const sameDay = appointments.filter((appointment) => appointment.date === date);
  return sameDay.length === 1 ? sameDay[0].id : '';
}

function initialValues(
  document: DocumentDto | null,
  linkedTo: AppointmentDto | null,
  appointments: AppointmentDto[],
): Values {
  if (document) {
    return {
      name: document.name,
      type: document.type ?? '',
      examDate: document.exam_date,
      appointmentId: document.appointment_id ?? '',
      notes: document.notes ?? '',
    };
  }
  const examDate = linkedTo?.date ?? todayIso();
  return {
    name: '',
    type: '',
    examDate,
    appointmentId: linkedTo?.id ?? appointmentOn(examDate, appointments),
    notes: '',
  };
}

function validate(
  values: Values,
  hasFile: boolean,
  isEditing: boolean,
): FieldErrors {
  const errors: FieldErrors = {};
  if (!isEditing && !hasFile) {
    errors.file = 'Escolha o arquivo do exame (PDF, JPG ou PNG).';
  }
  if (!values.name.trim()) {
    errors.name = 'Informe o nome do exame.';
  }
  if (!values.examDate) {
    errors.examDate = 'Informe a data do exame.';
  } else if (values.examDate > todayIso()) {
    errors.examDate = 'A data do exame não pode estar no futuro.';
  }
  return errors;
}

export function ExamDialog({
  open,
  patient,
  appointments,
  document = null,
  appointmentId = null,
  onClose,
  onSaved,
  extraAction,
}: ExamDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileErrorId = useId();
  const linkedTo =
    appointments.find((appointment) => appointment.id === appointmentId) ?? null;

  const [values, setValues] = useState<Values>(() =>
    initialValues(document, linkedTo, appointments),
  );
  const [prepared, setPrepared] = useState<PreparedFileInfo | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [linkTouched, setLinkTouched] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(initialValues(document, linkedTo, appointments));
    setPrepared(null);
    setOptimizing(false);
    setDragging(false);
    setLinkTouched(Boolean(document || linkedTo));
    setErrors({});
    setFormMessage(null);
  }, [open, document, appointmentId]);

  function update(field: keyof Values, value: string) {
    const next = { ...values, [field]: value };
    if (field === 'examDate' && !linkTouched) {
      next.appointmentId = appointmentOn(value, appointments);
    }
    if (field === 'appointmentId') setLinkTouched(true);
    setValues(next);
    if (Object.values(errors).some(Boolean)) {
      setErrors(validate(next, Boolean(prepared), Boolean(document)));
    }
  }

  async function handleFileSelected(candidate: File | undefined) {
    if (!candidate) return;
    setOptimizing(true);
    setFormMessage(null);
    setErrors((current) => ({ ...current, file: undefined }));

    try {
      const result = await compressExamFileIfNeeded(candidate);
      if (result.status === 'error') {
        setPrepared(null);
        setErrors((current) => ({ ...current, file: result.error }));
        return;
      }

      setPrepared({
        file: result.file,
        wasCompressed: result.wasCompressed,
        originalSize: result.originalSize,
        finalSize: result.finalSize,
      });

      setValues((current) => {
        if (current.name.trim()) return current;
        return {
          ...current,
          name: defaultDocumentNameFromFilename(candidate.name),
        };
      });
    } finally {
      setOptimizing(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    void handleFileSelected(event.dataTransfer.files[0]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || optimizing) return;

    const found = validate(values, Boolean(prepared), Boolean(document));
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setSaving(true);
    setFormMessage(null);

    try {
      let saved: DocumentDto;
      if (document) {
        saved = await apiRequest<DocumentDto>(`/documents/${document.id}`, {
          method: 'PATCH',
          body: {
            name: values.name.trim(),
            type: values.type || null,
            exam_date: values.examDate,
            appointment_id: values.appointmentId || null,
            notes: values.notes.trim() || null,
          },
        });
      } else {
        const formData = new FormData();
        formData.append('file', prepared!.file);
        formData.append('patient_id', patient.id);
        formData.append('name', values.name.trim());
        formData.append('exam_date', values.examDate);
        if (values.type) formData.append('type', values.type);
        if (values.appointmentId) formData.append('appointment_id', values.appointmentId);
        if (values.notes.trim()) formData.append('notes', values.notes.trim());

        saved = await apiRequest<DocumentDto>('/documents', {
          method: 'POST',
          body: formData,
        });
      }
      onSaved(saved);
    } catch (error) {
      setFormMessage(
        error instanceof ApiError && error.status === 404
          ? {
              tone: 'error',
              title: 'Não foi possível salvar',
              description: 'O exame ou o atendimento escolhido não existe mais.',
            }
          : describeCommonError(error),
      );
    } finally {
      setSaving(false);
    }
  }

  const linked = appointments.find(
    (appointment) => appointment.id === values.appointmentId,
  );
  const dateMismatch =
    linked && values.examDate && linked.date !== values.examDate
      ? `O atendimento foi em ${formatDate(linked.date)}, e o exame está em ${formatDate(values.examDate)}.`
      : undefined;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="md"
      title={document ? 'Editar exame' : 'Anexar exame'}
      description={
        document
          ? `Exame do prontuário de ${patient.name}.`
          : `Anexe laudos, exames laboratoriais, radiografias ou ultrassonografias de ${patient.name}.`
      }
    >
      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        {formMessage && (
          <Alert tone={formMessage.tone} title={formMessage.title}>
            {formMessage.description}
          </Alert>
        )}

        {document ? (
          <div className={styles.selectedFile}>
            <div className={styles.fileInfo}>
              <span className={styles.fileName}>{document.name}</span>
              <span className={styles.fileMeta}>
                {describeDocumentFormat(document.mime_type)} ·{' '}
                {formatFileSize(document.size_bytes)}
              </span>
            </div>
            <a
              href={document.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.inlineLink}
            >
              Abrir arquivo{' '}
              <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
            </a>
          </div>
        ) : (
          <div className={styles.fileSection}>
            <span className={styles.fileLabel}>Arquivo do exame</span>
            {prepared ? (
              <div className={styles.selectedFile}>
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>{prepared.file.name}</span>
                  <span className={styles.fileMeta}>
                    {describeDocumentFormat(prepared.file.type)} ·{' '}
                    {formatFileSize(prepared.finalSize)}
                  </span>
                  {prepared.wasCompressed && (
                    <span className={styles.optimizedNote}>
                      Otimizado automaticamente de {formatFileSize(prepared.originalSize)}{' '}
                      para {formatFileSize(prepared.finalSize)} preservando a nitidez
                      diagnóstica.
                    </span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Trocar arquivo
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.dropzone}
                data-dragging={dragging || undefined}
                data-error={errors.file ? true : undefined}
                aria-describedby={errors.file ? fileErrorId : undefined}
                disabled={optimizing}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <FileUp size={22} strokeWidth={1.75} aria-hidden="true" />
                <span className={styles.dropTitle}>
                  {optimizing
                    ? 'Otimizando exame preservando qualidade diagnóstica…'
                    : 'Clique para escolher ou arraste o arquivo'}
                </span>
                <span className={styles.dropHint}>
                  PDF, JPG ou PNG · Arquivos acima de 4,5 MB são otimizados automaticamente
                </span>
              </button>
            )}
            {errors.file && (
              <p id={fileErrorId} className={styles.fieldError} role="alert">
                {errors.file}
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_DOCUMENT_MIME_TYPES.join(',')}
              className="visually-hidden"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                void handleFileSelected(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </div>
        )}

        <TextField
          label="Nome do exame"
          name="exam-name"
          autoComplete="off"
          maxLength={120}
          placeholder="Ex.: Hemograma completo, Raio-X torácico, Ultrassom abdominal"
          data-autofocus={document ? undefined : true}
          value={values.name}
          error={errors.name}
          onChange={(event) => update('name', event.target.value)}
        />

        <div className={styles.row}>
          <Select
            label="Tipo"
            optional
            name="exam-type"
            value={values.type}
            onChange={(event) => update('type', event.target.value)}
          >
            <option value="">Não classificado</option>
            {DOCUMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <TextField
            label="Data do exame"
            name="exam-date"
            type="date"
            max={todayIso()}
            value={values.examDate}
            error={errors.examDate}
            onChange={(event) => update('examDate', event.target.value)}
          />
        </div>

        {appointments.length > 0 && (
          <Select
            label="Atendimento"
            optional
            name="appointment"
            value={values.appointmentId}
            hint={dateMismatch ?? 'Atendimento ao qual este exame está relacionado.'}
            labelAction={
              linked && (
                <Link
                  to={`?aba=historico&atendimento=${linked.id}`}
                  replace
                  className={styles.inlineLink}
                >
                  Ver atendimento
                </Link>
              )
            }
            onChange={(event) => update('appointmentId', event.target.value)}
          >
            <option value="">Nenhum (avulso / de outra clínica)</option>
            {appointments.map((appointment) => (
              <option key={appointment.id} value={appointment.id}>
                {formatDate(appointment.date)} · {appointmentTitle(appointment)}
              </option>
            ))}
          </Select>
        )}

        <Textarea
          label="Observações"
          optional
          name="exam-notes"
          minRows={2}
          value={values.notes}
          onChange={(event) => update('notes', event.target.value)}
        />

        <div className={styles.actions}>
          {extraAction && <div className={styles.extraAction}>{extraAction}</div>}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={optimizing}
            loading={saving}
            loadingLabel={document ? 'Salvando…' : 'Enviando…'}
          >
            {document ? 'Salvar alterações' : 'Anexar exame'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
