import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiRequest } from '../../lib/api';
import { describeCommonError, type FormMessage } from '../../lib/errors';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { validateEmail } from '../../lib/validation';
import { Alert } from '../../components/Alert/Alert';
import { AuthLayout } from '../../components/AuthLayout/AuthLayout';
import form from '../../components/AuthLayout/AuthForm.module.css';
import { BrandMark } from '../../components/BrandMark/BrandMark';
import { Button, ButtonLink } from '../../components/Button/Button';
import { TextField } from '../../components/TextField/TextField';
import { RECOVERY_PITCH } from './recoveryPitch';
import styles from './PasswordRecovery.module.css';

/**
 * Pede o link de redefinição. A resposta é a mesma com ou sem conta (a API não
 * revela quem está cadastrado), então a confirmação fala em "se houver conta".
 */
export function ForgotPasswordPage() {
  useDocumentTitle('Recuperar acesso');
  const location = useLocation();
  // Vindo do login, o e-mail já digitado lá.
  const initialEmail = (location.state as { email?: string } | null)?.email ?? '';

  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState<string>();
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) {
      emailRef.current?.focus();
    }
  }, []);

  async function requestLink() {
    setSubmitting(true);
    setFormMessage(null);
    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim() },
        auth: false,
      });
      setSentTo(email.trim());
    } catch (error) {
      setFormMessage(describeCommonError(error));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const error = validateEmail(email);
    setEmailError(error);
    if (error) {
      emailRef.current?.focus();
      return;
    }
    void requestLink();
  }

  return (
    <AuthLayout {...RECOVERY_PITCH}>
      {sentTo ? (
        <div className={form.form}>
          <div className={form.body}>
            <div className={form.mobileBrand}>
              <BrandMark size="lg" />
            </div>
            <header className={form.header} aria-live="polite">
              <h1 className={form.title}>Confira seu e-mail</h1>
              <p className={form.subtitle}>
                Se houver uma conta com <strong className={styles.email}>{sentTo}</strong>, você vai
                receber um link para criar uma senha nova. Ele vale por 1 hora.
              </p>
            </header>
            <p className={styles.note}>
              Não chegou em alguns minutos? Veja a caixa de spam ou confira se o e-mail está certo.
            </p>
            {formMessage && (
              <Alert tone={formMessage.tone} title={formMessage.title}>
                {formMessage.description}
              </Alert>
            )}
          </div>
          <div className={form.actions}>
            <ButtonLink to="/entrar" size="lg" fullWidth>
              Voltar para entrar
            </ButtonLink>
            <div className={styles.secondaryActions}>
              <Button
                variant="ghost"
                loading={submitting}
                loadingLabel="Enviando…"
                onClick={requestLink}
              >
                Enviar de novo
              </Button>
              <Button variant="ghost" onClick={() => setSentTo(null)}>
                Usar outro e-mail
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <form className={form.form} noValidate onSubmit={handleSubmit}>
          <div className={form.body}>
            <div className={form.mobileBrand}>
              <BrandMark size="lg" />
            </div>
            <header className={form.header}>
              <h1 className={form.title}>Recuperar acesso</h1>
              <p className={form.subtitle}>
                Informe o e-mail da sua conta. Enviamos um link para você criar uma senha nova.
              </p>
            </header>

            {formMessage && (
              <Alert tone={formMessage.tone} title={formMessage.title}>
                {formMessage.description}
              </Alert>
            )}

            <TextField
              ref={emailRef}
              label="E-mail"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="nome@exemplo.com.br"
              value={email}
              error={emailError}
              onChange={(event) => {
                setEmail(event.target.value);
                setFormMessage(null);
                if (emailError) setEmailError(validateEmail(event.target.value));
              }}
              onBlur={() => {
                if (email.trim()) setEmailError(validateEmail(email));
              }}
            />
          </div>

          <div className={form.actions}>
            <Button type="submit" size="lg" fullWidth loading={submitting} loadingLabel="Enviando…">
              Enviar link
            </Button>
            <p className={form.footnote}>
              Lembrou a senha? <Link to="/entrar">Entrar</Link>
            </p>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
