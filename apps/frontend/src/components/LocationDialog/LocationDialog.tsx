import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { LocationDto } from '@meupaciente/shared';
import { apiRequest } from '../../lib/api';
import { describeCommonError, type FormMessage } from '../../lib/errors';
import { digitsOnly, maskPhoneInput } from '../../lib/format';
import { validatePhone } from '../../lib/validation';
import { Alert } from '../Alert/Alert';
import { Button } from '../Button/Button';
import { Dialog } from '../Dialog/Dialog';
import { TextField } from '../TextField/TextField';
import styles from './LocationDialog.module.css';

interface LocationDialogProps {
  open: boolean;
  // Sem local, cadastra um novo; com local, edita os dados dele.
  location?: LocationDto | null;
  onClose: () => void;
  onSaved: (location: LocationDto) => void;
  // Edição: ação à esquerda dos botões (ex.: excluir).
  extraAction?: ReactNode;
}

interface Values {
  name: string;
  address: string;
  phone: string;
}

interface FieldErrors {
  name?: string;
  phone?: string;
}

function validate(values: Values): FieldErrors {
  const errors: FieldErrors = {};
  if (values.name.trim().length < 2)
    errors.name = 'Informe o nome do local, com pelo menos 2 caracteres.';
  errors.phone = validatePhone(values.phone);
  return errors;
}

function initialValues(location: LocationDto | null): Values {
  return {
    name: location?.name ?? '',
    address: location?.address ?? '',
    phone: maskPhoneInput(location?.phone ?? ''),
  };
}

/**
 * Cadastro e edição de local (clínica parceira, consultório): o mesmo
 * formulário no atendimento e na tela de locais.
 */
export function LocationDialog({
  open,
  location = null,
  onClose,
  onSaved,
  extraAction,
}: LocationDialogProps) {
  const [values, setValues] = useState<Values>(() => initialValues(location));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(initialValues(location));
    setErrors({});
    setFormMessage(null);
  }, [open, location]);

  function update(field: keyof Values, value: string) {
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
    // Campo esvaziado vai como null: na edição, limpa o valor salvo.
    const body = {
      name: values.name.trim(),
      address: values.address.trim() || null,
      phone: digitsOnly(values.phone) || null,
    };
    try {
      const saved = location
        ? await apiRequest<LocationDto>(`/locations/${location.id}`, { method: 'PATCH', body })
        : await apiRequest<LocationDto>('/locations', { method: 'POST', body });
      onSaved(saved);
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
      size={location ? 'md' : 'sm'}
      title={location ? 'Editar local' : 'Novo local'}
      description={
        location
          ? 'A alteração aparece também nos atendimentos já registrados aqui.'
          : 'Clínica parceira ou consultório onde você atende. Fica salvo para os próximos atendimentos.'
      }
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
          // Só no cadastro: na edição o teclado do celular cobriria os dados ao abrir.
          data-autofocus={location ? undefined : true}
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
          {extraAction && <div className={styles.extraAction}>{extraAction}</div>}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving} loadingLabel="Salvando…">
            {location ? 'Salvar alterações' : 'Salvar local'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
