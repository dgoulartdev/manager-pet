import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { ApiError } from '../../lib/api';
import { describeCommonError, type FormMessage } from '../../lib/errors';
import { prefersRememberedSession } from '../../lib/session';
import { validateEmail } from '../../lib/validation';
import { Alert } from '../../components/Alert/Alert';
import { AuthLayout } from '../../components/AuthLayout/AuthLayout';
import form from '../../components/AuthLayout/AuthForm.module.css';
import { BrandMark } from '../../components/BrandMark/BrandMark';
import { Button } from '../../components/Button/Button';
import { Checkbox } from '../../components/Checkbox/Checkbox';
import { PasswordField } from '../../components/TextField/PasswordField';
import { TextField } from '../../components/TextField/TextField';

interface FieldErrors {
  email?: string;
  password?: string;
}

// Estado de navegação: de onde o usuário veio e, vindo do cadastro, o e-mail já digitado.
interface LoginLocationState {
  from?: string;
  email?: string;
}

function validatePassword(value: string): string | undefined {
  return value ? undefined : 'Informe sua senha.';
}

// Traduz a resposta da API para o que a tela mostra.
function describeLoginError(error: unknown): { message?: FormMessage; fields?: FieldErrors } {
  if (error instanceof ApiError && error.status === 401) {
    return {
      message: {
        tone: 'error',
        title: 'E-mail ou senha incorretos',
        description: 'Confira os dados e tente de novo.',
      },
    };
  }
  if (error instanceof ApiError && error.status === 422) {
    const fields: FieldErrors = {};
    for (const fieldError of error.fieldErrors) {
      if (fieldError.field === 'email')
        fields.email = 'Informe um e-mail válido, com domínio completo.';
      if (fieldError.field === 'password') fields.password = 'Informe sua senha.';
    }
    return { fields };
  }
  return { message: describeCommonError(error) };
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;
  const redirectTo = locationState?.from ?? '/inicio';

  const [email, setEmail] = useState(locationState?.email ?? '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(prefersRememberedSession);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Foco automático só com mouse: no celular ele abriria o teclado sem pedir.
  // Com o e-mail já preenchido, o próximo passo é a senha.
  const startsWithEmail = Boolean(locationState?.email);
  useEffect(() => {
    if (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) {
      (startsWithEmail ? passwordRef : emailRef).current?.focus();
    }
  }, [startsWithEmail]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const errors: FieldErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      (errors.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    setSubmitting(true);
    setFormMessage(null);
    try {
      await login({ email: email.trim(), password }, remember);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const { message, fields } = describeLoginError(error);
      setFormMessage(message ?? null);
      if (fields) setFieldErrors(fields);
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      headline="O prontuário dos seus pacientes, no bolso do plantão."
      description="Histórico, vacinas, peso e evolução de cada cão e gato — à mão na clínica parceira, no consultório ou em domicílio."
      highlights={[
        'Timeline de atendimentos de cada paciente',
        'Vacinas com a data da próxima dose',
        'Busca por paciente, tutor ou telefone',
      ]}
    >
      <form className={form.form} noValidate onSubmit={handleSubmit}>
        <div className={form.body}>
          <div className={form.mobileBrand}>
            <BrandMark size="lg" />
          </div>

          <header className={form.header}>
            <h1 className={form.title}>Entrar</h1>
            <p className={form.subtitle}>Acesse com o e-mail da sua conta.</p>
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
            error={fieldErrors.email}
            onChange={(event) => {
              setEmail(event.target.value);
              setFormMessage(null);
              // Com erro visível, revalida a cada tecla para o erro sumir ao corrigir.
              if (fieldErrors.email) {
                setFieldErrors((current) => ({
                  ...current,
                  email: validateEmail(event.target.value),
                }));
              }
            }}
            onBlur={() => {
              // No blur só valida o formato; campo vazio só vira erro no envio.
              if (email.trim()) {
                setFieldErrors((current) => ({ ...current, email: validateEmail(email) }));
              }
            }}
          />

          <PasswordField
            ref={passwordRef}
            label="Senha"
            name="password"
            autoComplete="current-password"
            value={password}
            error={fieldErrors.password}
            labelAction={
              <Link to="/esqueci-senha" state={{ email: email.trim() }} className={form.inlineLink}>
                Esqueci minha senha
              </Link>
            }
            onChange={(event) => {
              setPassword(event.target.value);
              setFormMessage(null);
              if (fieldErrors.password) {
                setFieldErrors((current) => ({ ...current, password: undefined }));
              }
            }}
          />

          <Checkbox
            label="Manter conectado por 7 dias"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
          />
        </div>

        <div className={form.actions}>
          <Button type="submit" size="lg" fullWidth loading={submitting} loadingLabel="Entrando…">
            Entrar
          </Button>
          <p className={form.footnote}>
            Ainda não tem conta? <Link to="/criar-conta">Criar conta</Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
