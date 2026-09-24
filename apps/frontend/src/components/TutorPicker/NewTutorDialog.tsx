import { useEffect, useState, type FormEvent } from 'react';
import type { TutorDto } from '@meupaciente/shared';
import { ApiError, apiRequest } from '../../lib/api';
import { describeCommonError, type FormMessage } from '../../lib/errors';
import { digitsOnly, maskPhoneInput } from '../../lib/format';
import { validateEmail } from '../../lib/validation';
import { Alert } from '../Alert/Alert';
import { Button } from '../Button/Button';
import { Dialog } from '../Dialog/Dialog';
import { TextField } from '../TextField/TextField';
import styles from './NewTutorDialog.module.css';

interface NewTutorDialogProps {
  open: boolean;
  // O que foi digitado na busca: vira o nome, ou o telefone se for só número.
  initialText: string;
  onClose: () => void;
  onCreated: (tutor: TutorDto) => void;
}

interface FieldErrors {
  name?: string;
  phone?: string;
  email?: string;
}

function validate(values: { name: string; phone: string; email: string }): FieldErrors {
  const errors: FieldErrors = {};
  const name = values.name.trim();
  if (name.length < 2) errors.name = 'Informe o nome do tutor, com pelo menos 2 caracteres.';
  const phoneDigits = digitsOnly(values.phone);
  if (phoneDigits && phoneDigits.length < 10)
    errors.phone = 'Informe o DDD e o número, com 10 ou 11 dígitos.';
  if (values.email.trim()) errors.email = validateEmail(values.email);
  return errors;
}

export function NewTutorDialog({ open, initialText, onClose, onCreated }: NewTutorDialogProps) {
  const [values, setValues] = useState({ name: '', phone: '', email: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [saving, setSaving] = useState(false);

  // Cada abertura começa do que foi digitado na busca.
  useEffect(() => {
    if (!open) return;
    const looksLikePhone =
      /^[\d\s()+.-]+$/.test(initialText) && digitsOnly(initialText).length >= 4;
    setValues({
      name: looksLikePhone ? '' : initialText,
      phone: looksLikePhone ? maskPhoneInput(initialText) : '',
      email: '',
    });
    setErrors({});
    setFormMessage(null);
  }, [open, initialText]);

  function update(field: keyof FieldErrors, value: string) {
    const next = { ...values, [field]: field === 'phone' ? maskPhoneInput(value) : value };
    setValues(next);
    if (errors[field]) setErrors(validate(next));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const found = validate(values);
    setErrors(found);
    if (found.name || found.phone || found.email) return;

    setSaving(true);
    setFormMessage(null);
    try {
      const tutor = await apiRequest<TutorDto>('/tutors', {
        method: 'POST',
        body: {
          name: values.name.trim(),
          // Telefone guardado só com dígitos: a busca por telefone depende disso.
          phone: digitsOnly(values.phone) || undefined,
          email: values.email.trim() || undefined,
        },
      });
      onCreated(tutor);
    } catch (error) {
      const localErrors = validate(values);
      if (
        error instanceof ApiError &&
        error.status === 422 &&
        Object.values(localErrors).some(Boolean)
      ) {
        setErrors(localErrors);
      } else {
        setFormMessage(describeCommonError(error));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Novo tutor"
      description="Só o nome é obrigatório. O contato pode ser completado depois."
    >
      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        {formMessage && (
          <Alert tone={formMessage.tone} title={formMessage.title}>
            {formMessage.description}
          </Alert>
        )}
        <TextField
          label="Nome completo"
          name="tutor-name"
          autoComplete="off"
          autoCapitalize="words"
          maxLength={120}
          data-autofocus
          value={values.name}
          error={errors.name}
          onChange={(event) => update('name', event.target.value)}
        />
        <TextField
          label="Telefone"
          optional
          name="tutor-phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="(11) 99999-8888"
          value={values.phone}
          error={errors.phone}
          onChange={(event) => update('phone', event.target.value)}
        />
        <TextField
          label="E-mail"
          optional
          name="tutor-email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          value={values.email}
          error={errors.email}
          onChange={(event) => update('email', event.target.value)}
        />
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving} loadingLabel="Cadastrando…">
            Cadastrar e vincular
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
