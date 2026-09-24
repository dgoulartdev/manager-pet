import { useEffect, useState, type FormEvent } from 'react';
import type { LocationDto } from '@meupaciente/shared';
import { apiRequest } from '../../lib/api';
import { describeCommonError, type FormMessage } from '../../lib/errors';
import { digitsOnly, maskPhoneInput } from '../../lib/format';
import { Alert } from '../../components/Alert/Alert';
import { Button } from '../../components/Button/Button';
import { Dialog } from '../../components/Dialog/Dialog';
import { TextField } from '../../components/TextField/TextField';
import styles from './NewLocationDialog.module.css';

interface NewLocationDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (location: LocationDto) => void;
}

interface FieldErrors {
  name?: string;
  phone?: string;
}

function validate(values: { name: string; phone: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (values.name.trim().length < 2)
    errors.name = 'Informe o nome do local, com pelo menos 2 caracteres.';
  const phone = digitsOnly(values.phone);
  if (phone && phone.length < 10) errors.phone = 'Informe o DDD e o número, com 10 ou 11 dígitos.';
  return errors;
}

/** Cadastro rápido de local (clínica parceira, consultório) sem sair do atendimento. */
export function NewLocationDialog({ open, onClose, onCreated }: NewLocationDialogProps) {
  const [values, setValues] = useState({ name: '', address: '', phone: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues({ name: '', address: '', phone: '' });
    setErrors({});
    setFormMessage(null);
  }, [open]);

  function update(field: 'name' | 'address' | 'phone', value: string) {
    const next = { ...values, [field]: field === 'phone' ? maskPhoneInput(value) : value };
    setValues(next);
    if (Object.values(errors).some(Boolean)) setErrors(validate(next));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const found = validate(values);
    setErrors(found);
    if (found.name || found.phone) return;

    setSaving(true);
    setFormMessage(null);
    try {
      const location = await apiRequest<LocationDto>('/locations', {
        method: 'POST',
        body: {
          name: values.name.trim(),
          address: values.address.trim() || undefined,
          phone: digitsOnly(values.phone) || undefined,
        },
      });
      onCreated(location);
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
      title="Novo local"
      description="Clínica parceira ou consultório onde você atende. Fica salvo para os próximos atendimentos."
    >
      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        {formMessage && (
          <Alert tone={formMessage.tone} title={formMessage.title}>
            {formMessage.description}
          </Alert>
        )}
        <TextField
          label="Nome"
          name="location-name"
          autoComplete="off"
          maxLength={120}
          placeholder="Ex.: Clínica Vida Animal"
          data-autofocus
          value={values.name}
          error={errors.name}
          onChange={(event) => update('name', event.target.value)}
        />
        <TextField
          label="Endereço"
          optional
          name="location-address"
          autoComplete="off"
          maxLength={255}
          value={values.address}
          onChange={(event) => update('address', event.target.value)}
        />
        <TextField
          label="Telefone"
          optional
          name="location-phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="(62) 3333-4444"
          value={values.phone}
          error={errors.phone}
          onChange={(event) => update('phone', event.target.value)}
        />
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving} loadingLabel="Salvando…">
            Salvar local
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
