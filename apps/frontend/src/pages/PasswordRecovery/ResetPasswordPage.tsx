import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { ApiError, apiRequest } from '../../lib/api';
import { describeCommonError, type FormMessage } from '../../lib/errors';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { validateNewPassword } from '../../lib/validation';
import { Alert } from '../../components/Alert/Alert';
import { AuthLayout } from '../../components/AuthLayout/AuthLayout';
import form from '../../components/AuthLayout/AuthForm.module.css';
import { BrandMark } from '../../components/BrandMark/BrandMark';
import { Button, ButtonLink } from '../../components/Button/Button';
import { PasswordStrength } from '../../components/PasswordStrength/PasswordStrength';
import { PasswordField } from '../../components/TextField/PasswordField';
import { RECOVERY_PITCH } from './recoveryPitch';

type Step = 'form' | 'done' | 'invalid-link';

const validatePassword = (value: string) => validateNewPassword(value, 'Crie uma senha nova.');

/**
 * Aberta pelo link do e-mail (/redefinir-senha?token=...). Funciona com ou sem
 * sessão neste aparelho: a troca encerra todas as sessões, inclusive esta.
 */
export function ResetPasswordPage() {
  useDocumentTitle('Criar senha nova');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { state, logout } = useAuth();
  const strengthId = useId();

  const [step, setStep] = useState<Step>(token ? 'form' : 'invalid-link');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string>();
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'form' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) {
      passwordRef.current?.focus();
    }
  }, [step]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const error = validatePassword(password);
    setPasswordError(error);
    if (error) {
      passwordRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setFormMessage(null);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: { token, new_password: password },
        auth: false,
      });
      // A API revogou todas as sessões; a deste aparelho sai junto.
      if (state.status === 'authenticated') await logout().catch(() => undefined);
      setStep('done');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setStep('invalid-link');
      } else if (error instanceof ApiError && error.status === 422) {
        setPasswordError('Use 8 ou mais caracteres, com pelo menos uma letra e um número.');
      } else {
        setFormMessage(describeCommonError(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout {...RECOVERY_PITCH}>
      {step === 'form' ? (
        <form className={form.form} noValidate onSubmit={handleSubmit}>
          <div className={form.body}>
            <div className={form.mobileBrand}>
              <BrandMark size="lg" />
            </div>
            <header className={form.header}>
              <h1 className={form.title}>Criar senha nova</h1>
              <p className={form.subtitle}>
                Depois de salvar, você entra com ela em todos os aparelhos.
              </p>
            </header>

            {formMessage && (
              <Alert tone={formMessage.tone} title={formMessage.title}>
                {formMessage.description}
              </Alert>
            )}

            <PasswordField
              ref={passwordRef}
              label="Senha nova"
              name="new-password"
              autoComplete="new-password"
              value={password}
              error={passwordError}
              describedBy={password ? strengthId : undefined}
              below={<PasswordStrength id={strengthId} password={password} />}
              onChange={(event) => {
                setPassword(event.target.value);
                setFormMessage(null);
                if (passwordError) setPasswordError(validatePassword(event.target.value));
              }}
              onBlur={() => {
                if (password) setPasswordError(validatePassword(password));
              }}
            />
          </div>

          <div className={form.actions}>
            <Button type="submit" size="lg" fullWidth loading={submitting} loadingLabel="Salvando…">
              Salvar senha nova
            </Button>
          </div>
        </form>
      ) : (
        <div className={form.form}>
          <div className={form.body}>
            <div className={form.mobileBrand}>
              <BrandMark size="lg" />
            </div>
            {step === 'done' ? (
              <header className={form.header} aria-live="polite">
                <h1 className={form.title}>Senha alterada</h1>
                <p className={form.subtitle}>
                  Entre com a senha nova. Os outros aparelhos conectados precisam entrar de novo.
                </p>
              </header>
            ) : (
              <header className={form.header} aria-live="polite">
                <h1 className={form.title}>Este link não vale mais</h1>
                <p className={form.subtitle}>
                  Os links de redefinição valem por 1 hora e funcionam uma vez só. Peça um novo para
                  continuar.
                </p>
              </header>
            )}
          </div>
          <div className={form.actions}>
            {step === 'done' ? (
              <ButtonLink to="/entrar" size="lg" fullWidth>
                Entrar
              </ButtonLink>
            ) : (
              <ButtonLink to="/esqueci-senha" size="lg" fullWidth>
                Pedir um link novo
              </ButtonLink>
            )}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
