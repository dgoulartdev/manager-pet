import { useEffect, useId, useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { ApiError } from '../../lib/api';
import { describeCommonError, type FormMessage } from '../../lib/errors';
import { PASSWORD_HINT, validateNewPassword } from '../../lib/validation';
import { Alert } from '../../components/Alert/Alert';
import { Button } from '../../components/Button/Button';
import { Dialog } from '../../components/Dialog/Dialog';
import { PasswordStrength } from '../../components/PasswordStrength/PasswordStrength';
import { PasswordField } from '../../components/TextField/PasswordField';
import { useToast } from '../../components/Toast/Toast';
import styles from './ChangePasswordDialog.module.css';

interface ChangePasswordDialogProps {
  open: boolean;
  // Vai num campo oculto: o gerenciador de senhas sabe de qual conta é a senha nova.
  email: string;
  onClose: () => void;
}

interface Values {
  current: string;
  next: string;
}

interface FieldErrors {
  current?: string;
  next?: string;
}

function validate(values: Values): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.current) errors.current = 'Informe sua senha atual.';
  errors.next = validateNewPassword(values.next, 'Crie a nova senha.');
  if (!errors.next && values.current && values.next === values.current) {
    errors.next = 'A nova senha precisa ser diferente da atual.';
  }
  return errors;
}

export function ChangePasswordDialog({ open, email, onClose }: ChangePasswordDialogProps) {
  const { changePassword } = useAuth();
  const showToast = useToast();
  const strengthId = useId();
  const [values, setValues] = useState<Values>({ current: '', next: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [saving, setSaving] = useState(false);

  // Senhas nunca ficam na tela depois de fechar: cada abertura começa vazia.
  useEffect(() => {
    if (!open) return;
    setValues({ current: '', next: '' });
    setErrors({});
    setFormMessage(null);
  }, [open]);

  function update(field: keyof Values, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    setFormMessage(null);
    if (errors[field]) setErrors(validate(next));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const found = validate(values);
    setErrors(found);
    if (found.current || found.next) return;

    setSaving(true);
    setFormMessage(null);
    try {
      const session = await changePassword(values.current, values.next);
      if (session === 'kept') {
        onClose();
        showToast({
          tone: 'success',
          title: 'Senha alterada',
          description: 'Nos outros aparelhos, será preciso entrar de novo com a nova senha.',
        });
      } else {
        // A sessão acabou: o app volta sozinho para o login.
        showToast({
          tone: 'warning',
          title: 'Senha alterada',
          description: 'Entre de novo com a nova senha.',
        });
      }
    } catch (error) {
      const wrongCurrent =
        error instanceof ApiError &&
        error.status === 422 &&
        error.fieldErrors.some((fieldError) => fieldError.field === 'current_password');
      if (wrongCurrent) setErrors({ current: 'Senha atual incorreta.' });
      else setFormMessage(describeCommonError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Alterar senha"
      description="Depois da troca, os outros aparelhos conectados precisam entrar de novo."
    >
      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        {formMessage && (
          <Alert tone={formMessage.tone} title={formMessage.title}>
            {formMessage.description}
          </Alert>
        )}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        <PasswordField
          label="Senha atual"
          name="current-password"
          autoComplete="current-password"
          data-autofocus
          value={values.current}
          error={errors.current}
          onChange={(event) => update('current', event.target.value)}
        />
        <PasswordField
          label="Nova senha"
          name="new-password"
          autoComplete="new-password"
          value={values.next}
          error={errors.next}
          hint={PASSWORD_HINT}
          describedBy={values.next ? strengthId : undefined}
          below={<PasswordStrength id={strengthId} password={values.next} />}
          onChange={(event) => update('next', event.target.value)}
        />
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving} loadingLabel="Alterando…">
            Alterar senha
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
