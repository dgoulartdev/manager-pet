import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, LogOut } from 'lucide-react';
import type { UpdateUserRequest, UserDto } from '@meupaciente/shared';
import { useAuth } from '../../auth/AuthContext';
import { ApiError, apiRequest } from '../../lib/api';
import { describeCommonError, type FormMessage } from '../../lib/errors';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { validateEmail, validatePersonName } from '../../lib/validation';
import { Alert } from '../../components/Alert/Alert';
import { Avatar } from '../../components/Avatar/Avatar';
import { Button } from '../../components/Button/Button';
import { TextField } from '../../components/TextField/TextField';
import { useToast } from '../../components/Toast/Toast';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import styles from './ProfilePage.module.css';

/** "setembro de 2026", no fuso do aparelho. */
function monthYear(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function ProfilePage() {
  useDocumentTitle('Perfil');
  const { state, logout } = useAuth();
  const [changingPassword, setChangingPassword] = useState(false);

  // A rota só abre com sessão (RequireAuth); o usuário sempre existe aqui.
  if (state.status !== 'authenticated') return null;
  const { user } = state;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Perfil</h1>
        <p className={styles.subtitle}>Seus dados de acesso e a segurança da conta.</p>
      </header>

      <section className={styles.identity} aria-label="Sua conta">
        <Avatar name={user.name} kind="person" size="lg" />
        <div className={styles.identityText}>
          <p className={styles.identityName}>{user.name}</p>
          <p className={styles.identityEmail}>{user.email}</p>
          <p className={styles.identitySince}>No MeuPaciente desde {monthYear(user.created_at)}</p>
        </div>
        <Button
          variant="secondary"
          className={styles.logout}
          icon={<LogOut size={18} strokeWidth={1.75} aria-hidden="true" />}
          onClick={logout}
        >
          Sair
        </Button>
      </section>

      <AccountForm user={user} />

      <section className={styles.card} aria-labelledby="perfil-senha">
        <div className={styles.passwordRow}>
          <div className={styles.cardHeading}>
            <h2 id="perfil-senha" className={styles.cardTitle}>
              Senha
            </h2>
            <p className={styles.cardText}>
              Troque se desconfiar que alguém a conhece. Os outros aparelhos conectados precisam
              entrar de novo.
            </p>
          </div>
          <Button
            variant="secondary"
            className={styles.passwordButton}
            icon={<KeyRound size={18} strokeWidth={1.75} aria-hidden="true" />}
            onClick={() => setChangingPassword(true)}
          >
            Alterar senha
          </Button>
        </div>
      </section>

      <ChangePasswordDialog
        open={changingPassword}
        email={user.email}
        onClose={() => setChangingPassword(false)}
      />
    </div>
  );
}

interface FieldErrors {
  name?: string;
  email?: string;
}

// Nome e e-mail: só o que mudou vai para a API (PATCH parcial).
function AccountForm({ user }: { user: UserDto }) {
  const { updateUser } = useAuth();
  const showToast = useToast();
  const [values, setValues] = useState({ name: user.name, email: user.email });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [saving, setSaving] = useState(false);

  // Depois de salvar, o formulário parte do que a API devolveu (e-mail normalizado).
  useEffect(() => {
    setValues({ name: user.name, email: user.email });
  }, [user.name, user.email]);

  const changes: UpdateUserRequest = {};
  if (values.name.trim() !== user.name) changes.name = values.name.trim();
  if (values.email.trim().toLowerCase() !== user.email) changes.email = values.email.trim();
  const dirty = Object.keys(changes).length > 0;

  function validate(next: typeof values): FieldErrors {
    return { name: validatePersonName(next.name), email: validateEmail(next.email) };
  }

  function update(field: keyof FieldErrors, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    setFormMessage(null);
    if (errors[field]) setErrors(validate(next));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !dirty) return;
    const found = validate(values);
    setErrors(found);
    if (found.name || found.email) return;

    setSaving(true);
    setFormMessage(null);
    try {
      const saved = await apiRequest<UserDto>('/users/me', { method: 'PATCH', body: changes });
      updateUser(saved);
      showToast({
        tone: 'success',
        title: 'Dados atualizados',
        description: changes.email ? `Agora você entra com ${saved.email}.` : undefined,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErrors({ email: 'Este e-mail já é usado em outra conta.' });
      } else if (error instanceof ApiError && error.status === 422) {
        setErrors(validate(values));
      } else {
        setFormMessage(describeCommonError(error));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card} aria-labelledby="perfil-dados">
      <div className={styles.cardHeading}>
        <h2 id="perfil-dados" className={styles.cardTitle}>
          Dados da conta
        </h2>
      </div>
      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        {formMessage && (
          <Alert tone={formMessage.tone} title={formMessage.title}>
            {formMessage.description}
          </Alert>
        )}
        <TextField
          label="Nome completo"
          name="name"
          autoComplete="name"
          autoCapitalize="words"
          maxLength={120}
          value={values.name}
          error={errors.name}
          onChange={(event) => update('name', event.target.value)}
        />
        <TextField
          label="E-mail"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          value={values.email}
          error={errors.email}
          hint="É com ele que você entra no MeuPaciente."
          onChange={(event) => update('email', event.target.value)}
        />
        <div className={styles.actions}>
          <Button type="submit" disabled={!dirty} loading={saving} loadingLabel="Salvando…">
            Salvar alterações
          </Button>
        </div>
      </form>
    </section>
  );
}
