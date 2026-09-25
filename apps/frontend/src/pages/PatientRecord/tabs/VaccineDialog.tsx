import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { AppointmentDto, PatientDetailDto, VaccineDto } from '@meupaciente/shared';
import { ApiError, apiRequest } from '../../../lib/api';
import { appointmentTitle } from '../../../lib/appointments';
import { formatDate, todayIso } from '../../../lib/dates';
import { describeCommonError, type FormMessage } from '../../../lib/errors';
import { Alert } from '../../../components/Alert/Alert';
import { Button } from '../../../components/Button/Button';
import { Dialog } from '../../../components/Dialog/Dialog';
import { Select } from '../../../components/Select/Select';
import { TextField } from '../../../components/TextField/TextField';
import styles from './VaccineDialog.module.css';

interface VaccineDialogProps {
  open: boolean;
  patient: PatientDetailDto;
  // Atendimentos do paciente (mais recente primeiro), para o vínculo.
  appointments: AppointmentDto[];
  // Sem vacina, registra uma nova; com vacina, edita o registro.
  vaccine?: VaccineDto | null;
  // Registro a partir de um atendimento: já vem vinculado a ele.
  appointmentId?: string | null;
  onClose: () => void;
  onSaved: (vaccine: VaccineDto) => void;
  // Edição: ação à esquerda dos botões (ex.: excluir).
  extraAction?: ReactNode;
}

interface Values {
  name: string;
  applicationDate: string;
  nextDoseDate: string;
  manufacturer: string;
  batch: string;
  appointmentId: string; // '' = sem vínculo
}

interface FieldErrors {
  name?: string;
  applicationDate?: string;
  nextDoseDate?: string;
}

function validate(values: Values): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.name.trim()) errors.name = 'Informe o nome da vacina.';
  if (!values.applicationDate) errors.applicationDate = 'Informe a data de aplicação.';
  else if (values.applicationDate > todayIso()) {
    errors.applicationDate = 'A aplicação não pode estar no futuro.';
  }
  if (
    values.nextDoseDate &&
    values.applicationDate &&
    values.nextDoseDate <= values.applicationDate
  ) {
    errors.nextDoseDate = 'A próxima dose precisa ser depois da aplicação.';
  }
  return errors;
}

/** Atendimento do dia da aplicação, se houver um só: é onde a dose foi dada, quase sempre. */
function appointmentOn(date: string, appointments: AppointmentDto[]): string {
  const sameDay = appointments.filter((appointment) => appointment.date === date);
  return sameDay.length === 1 ? sameDay[0].id : '';
}

function initialValues(
  vaccine: VaccineDto | null,
  linkedTo: AppointmentDto | null,
  appointments: AppointmentDto[],
): Values {
  if (vaccine) {
    return {
      name: vaccine.name,
      applicationDate: vaccine.application_date,
      nextDoseDate: vaccine.next_dose_date ?? '',
      manufacturer: vaccine.manufacturer ?? '',
      batch: vaccine.batch ?? '',
      appointmentId: vaccine.appointment_id ?? '',
    };
  }
  const applicationDate = linkedTo?.date ?? todayIso();
  return {
    name: '',
    applicationDate,
    nextDoseDate: '',
    manufacturer: '',
    batch: '',
    appointmentId: linkedTo?.id ?? appointmentOn(applicationDate, appointments),
  };
}

/**
 * Registro e edição de vacina aplicada — também serve para histórico trazido
 * de outra clínica (ADR-009): a data pode ser antiga e o atendimento é opcional.
 */
export function VaccineDialog({
  open,
  patient,
  appointments,
  vaccine = null,
  appointmentId = null,
  onClose,
  onSaved,
  extraAction,
}: VaccineDialogProps) {
  const linkedTo = appointments.find((appointment) => appointment.id === appointmentId) ?? null;
  const [values, setValues] = useState<Values>(() =>
    initialValues(vaccine, linkedTo, appointments),
  );
  // Enquanto a pessoa não mexe no vínculo, ele acompanha a data da aplicação.
  const [linkTouched, setLinkTouched] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(initialValues(vaccine, linkedTo, appointments));
    setLinkTouched(Boolean(vaccine || linkedTo));
    setErrors({});
    setFormMessage(null);
    // Só ao abrir: se a lista de atendimentos recarregar com o diálogo aberto,
    // o que já foi digitado não se perde.
  }, [open, vaccine, appointmentId]);

  function update(field: keyof Values, value: string) {
    const next = { ...values, [field]: value };
    if (field === 'applicationDate' && !linkTouched) {
      next.appointmentId = appointmentOn(value, appointments);
    }
    if (field === 'appointmentId') setLinkTouched(true);
    setValues(next);
    if (Object.values(errors).some(Boolean)) setErrors(validate(next));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const found = validate(values);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setSaving(true);
    setFormMessage(null);
    // Campo esvaziado vai como null: na edição, limpa o valor salvo.
    const body = {
      name: values.name.trim(),
      application_date: values.applicationDate,
      next_dose_date: values.nextDoseDate || null,
      manufacturer: values.manufacturer.trim() || null,
      batch: values.batch.trim() || null,
      appointment_id: values.appointmentId || null,
    };
    try {
      const saved = vaccine
        ? await apiRequest<VaccineDto>(`/vaccines/${vaccine.id}`, { method: 'PATCH', body })
        : await apiRequest<VaccineDto>('/vaccines', {
            method: 'POST',
            body: { patient_id: patient.id, ...body },
          });
      onSaved(saved);
    } catch (error) {
      // Excluído em outra aba ou aparelho enquanto o diálogo estava aberto.
      setFormMessage(
        error instanceof ApiError && error.status === 404
          ? {
              tone: 'error',
              title: 'Não foi possível salvar',
              description: 'A vacina ou o atendimento escolhido não existe mais.',
            }
          : describeCommonError(error),
      );
    } finally {
      setSaving(false);
    }
  }

  const linked = appointments.find((appointment) => appointment.id === values.appointmentId);
  const dateMismatch =
    linked && values.applicationDate && linked.date !== values.applicationDate
      ? `O atendimento foi em ${formatDate(linked.date)}, e a aplicação está em ${formatDate(values.applicationDate)}.`
      : undefined;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size={vaccine ? 'md' : 'sm'}
      title={vaccine ? 'Editar vacina' : 'Registrar vacina'}
      description={
        vaccine
          ? `Registro da carteira de ${patient.name}.`
          : `Dose aplicada em ${patient.name}, aqui ou em outra clínica.`
      }
    >
      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        {formMessage && (
          <Alert tone={formMessage.tone} title={formMessage.title}>
            {formMessage.description}
          </Alert>
        )}
        <TextField
          label="Vacina"
          name="vaccine-name"
          autoComplete="off"
          maxLength={120}
          placeholder="Ex.: V10, antirrábica, FeLV"
          // Só no cadastro: na edição o teclado do celular cobriria os dados ao abrir.
          data-autofocus={vaccine ? undefined : true}
          value={values.name}
          error={errors.name}
          onChange={(event) => update('name', event.target.value)}
        />
        <div className={styles.row}>
          <TextField
            label="Aplicação"
            name="application-date"
            type="date"
            max={todayIso()}
            value={values.applicationDate}
            error={errors.applicationDate}
            onChange={(event) => update('applicationDate', event.target.value)}
          />
          <TextField
            label="Próxima dose"
            optional
            name="next-dose-date"
            type="date"
            min={values.applicationDate || undefined}
            value={values.nextDoseDate}
            error={errors.nextDoseDate}
            onChange={(event) => update('nextDoseDate', event.target.value)}
          />
        </div>
        <div className={styles.row}>
          <TextField
            label="Fabricante"
            optional
            name="manufacturer"
            autoComplete="off"
            maxLength={120}
            value={values.manufacturer}
            onChange={(event) => update('manufacturer', event.target.value)}
          />
          <TextField
            label="Lote"
            optional
            name="batch"
            autoComplete="off"
            maxLength={60}
            value={values.batch}
            onChange={(event) => update('batch', event.target.value)}
          />
        </div>
        {/* Sem atendimentos registrados não há o que vincular. */}
        {appointments.length > 0 && (
          <Select
            label="Atendimento"
            optional
            name="appointment"
            value={values.appointmentId}
            hint={dateMismatch ?? 'Em qual atendimento a dose foi aplicada.'}
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
            <option value="">Nenhum (fora de um atendimento)</option>
            {appointments.map((appointment) => (
              <option key={appointment.id} value={appointment.id}>
                {formatDate(appointment.date)} · {appointmentTitle(appointment)}
              </option>
            ))}
          </Select>
        )}
        <div className={styles.actions}>
          {extraAction && <div className={styles.extraAction}>{extraAction}</div>}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={saving}
            loadingLabel={vaccine ? 'Salvando…' : 'Registrando…'}
          >
            {vaccine ? 'Salvar alterações' : 'Registrar vacina'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
