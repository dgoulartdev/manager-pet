import { useEffect, useState, type FormEvent } from 'react';
import type { PatientDetailDto, VaccineDto } from '@meupaciente/shared';
import { apiRequest } from '../../../lib/api';
import { todayIso } from '../../../lib/dates';
import { describeCommonError, type FormMessage } from '../../../lib/errors';
import { Alert } from '../../../components/Alert/Alert';
import { Button } from '../../../components/Button/Button';
import { Dialog } from '../../../components/Dialog/Dialog';
import { TextField } from '../../../components/TextField/TextField';
import { useToast } from '../../../components/Toast/Toast';
import styles from './VaccineDialog.module.css';

interface VaccineDialogProps {
  open: boolean;
  patient: PatientDetailDto;
  onClose: () => void;
  onCreated: (vaccine: VaccineDto) => void;
}

interface Values {
  name: string;
  applicationDate: string;
  nextDoseDate: string;
  manufacturer: string;
  batch: string;
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

const emptyValues = (): Values => ({
  name: '',
  applicationDate: todayIso(),
  nextDoseDate: '',
  manufacturer: '',
  batch: '',
});

/**
 * Registro de vacina aplicada — também serve para histórico trazido de outra
 * clínica (ADR-009): a data de aplicação pode ser antiga.
 */
export function VaccineDialog({
  open,
  patient,
  onClose,
  onCreated,
}: VaccineDialogProps) {
  const showToast = useToast();
  const [values, setValues] = useState<Values>(emptyValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(emptyValues());
    setErrors({});
    setFormMessage(null);
  }, [open]);

  function update(field: keyof Values, value: string) {
    const next = { ...values, [field]: value };
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
    try {
      const vaccine = await apiRequest<VaccineDto>('/vaccines', {
        method: 'POST',
        body: {
          patient_id: patient.id,
          name: values.name.trim(),
          application_date: values.applicationDate,
          next_dose_date: values.nextDoseDate || undefined,
          manufacturer: values.manufacturer.trim() || undefined,
          batch: values.batch.trim() || undefined,
        },
      });
      showToast({
        tone: 'success',
        title: `${vaccine.name} registrada na carteira de ${patient.name}`,
      });
      onCreated(vaccine);
    } catch (error) {
      setFormMessage(describeCommonError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Registrar vacina"
      description={`Dose aplicada em ${patient.name}, aqui ou em outra clínica.`}
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
          data-autofocus
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
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving} loadingLabel="Registrando…">
            Registrar vacina
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
