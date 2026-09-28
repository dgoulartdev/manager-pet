import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { TutorDto } from '@meupaciente/shared';
import { ApiError, apiRequest } from '../../lib/api';
import { describeCommonError, type FormMessage } from '../../lib/errors';
import { digitsOnly, maskPhoneInput } from '../../lib/format';
import { validateEmail, validatePhone } from '../../lib/validation';
import { Alert } from '../Alert/Alert';
import { Button } from '../Button/Button';
import { Dialog } from '../Dialog/Dialog';
import { TextField } from '../TextField/TextField';
import styles from './TutorDialog.module.css';

interface TutorDialogProps {
  open: boolean;
  // Sem tutor, cadastra um novo; com tutor, edita os dados dele.
  tutor?: TutorDto | null;
  // Cadastro: o que foi digitado na busca vira o nome, ou o telefone se for só número.
  initialText?: string;
  // Texto do botão no cadastro (na edição é sempre "Salvar alterações").
  createLabel?: string;
  onClose: () => void;
  onSaved: (tutor: TutorDto) => void;
  // Edição: conteúdo entre os campos e os botões (ex.: pacientes vinculados).
  children?: ReactNode;
  // Edição: ação à esquerda dos botões (ex.: excluir).
  extraAction?: ReactNode;
}

interface Values {
  name: string;
  phone: string;
  email: string;
}

interface FieldErrors {
  name?: string;
  phone?: string;
  email?: string;
}

function validate(values: Values): FieldErrors {
  const errors: FieldErrors = {};
  const name = values.name.trim();
  if (name.length < 2) errors.name = 'Informe o nome do tutor, com pelo menos 2 caracteres.';
  errors.phone = validatePhone(values.phone);
  if (values.email.trim()) errors.email = validateEmail(values.email);
  return errors;
}

function initialValues(tutor: TutorDto | null, initialText: string): Values {
  if (tutor) {
    return { name: tutor.name, phone: maskPhoneInput(tutor.phone ?? ''), email: tutor.email ?? '' };
  }
  const looksLikePhone = /^[\d\s()+.-]+$/.test(initialText) && digitsOnly(initialText).length >= 4;
  return {
    name: looksLikePhone ? '' : initialText,
    phone: looksLikePhone ? maskPhoneInput(initialText) : '',
    email: '',
  };
}

/** Cadastro e edição de tutor: o mesmo formulário no seletor de tutor e na tela de tutores. */
export function TutorDialog({
  open,
  tutor = null,
  initialText = '',
  createLabel = 'Cadastrar tutor',
  onClose,
  onSaved,
  children,
  extraAction,
}: TutorDialogProps) {
  const [values, setValues] = useState<Values>(() => initialValues(tutor, initialText));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [saving, setSaving] = useState(false);

  // Cada abertura começa dos dados do tutor (edição) ou do que foi digitado na busca.
  useEffect(() => {
    if (!open) return;
    setValues(initialValues(tutor, initialText));
    setErrors({});
    setFormMessage(null);
  }, [open, tutor, initialText]);

  function update(field: keyof Values, value: string) {
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
    // Telefone guardado só com dígitos: a busca por telefone depende disso.
    // Na edição, campo esvaziado vai como null para limpar o valor salvo.
    const body = {
      name: values.name.trim(),
      phone: digitsOnly(values.phone) || null,
      email: values.email.trim() || null,
    };
    try {
      const saved = tutor
        ? await apiRequest<TutorDto>(`/tutors/${tutor.id}`, { method: 'PATCH', body })
        : await apiRequest<TutorDto>('/tutors', { method: 'POST', body });
      onSaved(saved);
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
      size={tutor ? 'md' : 'sm'}
      title={tutor ? 'Editar tutor' : 'Novo tutor'}
      description={
        tutor
          ? 'Os dados valem para todos os pacientes deste tutor.'
          : 'Só o nome é obrigatório. O contato pode ser completado depois.'
      }
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
          // Só no cadastro: na edição o teclado do celular cobriria os dados ao abrir.
          data-autofocus={tutor ? undefined : true}
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
        {children}
        <div className={styles.actions}>
          {extraAction && <div className={styles.extraAction}>{extraAction}</div>}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={saving}
            loadingLabel={tutor ? 'Salvando…' : 'Cadastrando…'}
          >
            {tutor ? 'Salvar alterações' : createLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
