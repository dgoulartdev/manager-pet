import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { ApiError } from '../../lib/api';
import { describeCommonError, type FormMessage } from '../../lib/errors';
import { prefersRememberedSession } from '../../lib/session';
import { meetsPasswordRule, validateEmail } from '../../lib/validation';
import { Alert } from '../../components/Alert/Alert';
import { AuthLayout } from '../../components/AuthLayout/AuthLayout';
import form from '../../components/AuthLayout/AuthForm.module.css';
import { BrandMark } from '../../components/BrandMark/BrandMark';
import { Button } from '../../components/Button/Button';
import { PasswordStrength } from '../../components/PasswordStrength/PasswordStrength';
import { PasswordField } from '../../components/TextField/PasswordField';
import { TextField } from '../../components/TextField/TextField';
import styles from './RegisterPage.module.css';

const PASSWORD_HINT = '8 ou mais caracteres, com letras e números.';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

function validateName(value: string): string | undefined {
  const name = value.trim();
  if (!name) return 'Informe seu nome.';
  if (name.length < 2) return 'Use pelo menos 2 caracteres.';
  return undefined;
}

function validatePassword(value: string): string | undefined {
  if (!value) return 'Crie uma senha.';
  if (!meetsPasswordRule(value)) return 'Use 8 ou mais caracteres, com pelo menos uma letra e um número.';
  return undefined;
}

const VALIDATORS: Record<keyof FieldErrors, (value: string) => string | undefined> = {
  name: validateName,
  email: validateEmail,
  password: validatePassword,
};

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const strengthId = useId();

  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
  };

  // Foco automático só com mouse: no celular ele abriria o teclado sem pedir.
  const nameRef = refs.name;
  useEffect(() => {
    if (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) {
      nameRef.current?.focus();
    }
  }, [nameRef]);

  function updateField(field: keyof FieldErrors, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFormMessage(null);
    if (field === 'email') setEmailTaken(false);
    // Com erro visível, revalida a cada tecla para o erro sumir ao corrigir.
    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: VALIDATORS[field](value) }));
    }
  }

  // Erros de campo aparecem ao sair dele — mas campo ainda vazio só no envio.
  function validateOnBlur(field: keyof FieldErrors) {
    if (values[field].trim()) {
      setFieldErrors((current) => ({ ...current, [field]: VALIDATORS[field](values[field]) }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const errors: FieldErrors = {
      name: validateName(values.name),
      email: validateEmail(values.email),
      password: validatePassword(values.password),
    };
    setFieldErrors(errors);
    const firstInvalid = (['name', 'email', 'password'] as const).find((field) => errors[field]);
    if (firstInvalid) {
      refs[firstInvalid].current?.focus();
      return;
    }

    setSubmitting(true);
    setFormMessage(null);
    setEmailTaken(false);
    try {
      await register(
        { name: values.name.trim(), email: values.email.trim(), password: values.password },
        prefersRememberedSession(),
      );
      navigate('/pacientes', { replace: true });
    } catch (error) {
      setSubmitting(false);
      if (error instanceof ApiError && error.status === 409) {
        setEmailTaken(true);
        return;
      }
      if (error instanceof ApiError && error.status === 422) {
        // A validação local cobre as regras da API; se algo passou, marca o campo.
        const fields: FieldErrors = {};
        for (const { field } of error.fieldErrors) {
          if (field === 'name' || field === 'email' || field === 'password') {
            fields[field] = VALIDATORS[field](values[field]) ?? 'Confira este campo.';
          }
        }
        setFieldErrors(fields);
        return;
      }
      setFormMessage(describeCommonError(error));
    }
  }

  return (
    <AuthLayout
      headline="Comece pelo primeiro paciente hoje mesmo."
      description="Crie a conta e cadastre tutor e paciente em seguida. O resto do prontuário você completa a cada atendimento."
      highlights={[
        'Só nome e tutor são obrigatórios para cadastrar um paciente',
        'Atendimentos em clínica parceira, local avulso ou domicílio',
        'Seus dados ficam separados dos de qualquer outro profissional',
      ]}
    >
      <form className={form.form} noValidate onSubmit={handleSubmit}>
        <div className={form.body}>
          <div className={form.mobileBrand}>
            <BrandMark size="lg" />
          </div>

          <header className={form.header}>
            <h1 className={form.title}>Criar conta</h1>
            <p className={form.subtitle}>São três campos. Ao terminar, você já entra no sistema.</p>
          </header>

          {emailTaken && (
            <Alert tone="warning" title="Este e-mail já tem uma conta">
              <Link to="/entrar" state={{ email: values.email.trim() }}>
                Entrar com este e-mail
              </Link>{' '}
              ou <Link to="/esqueci-senha">recuperar a senha</Link>.
            </Alert>
          )}

          {formMessage && (
            <Alert tone={formMessage.tone} title={formMessage.title}>
              {formMessage.description}
            </Alert>
          )}

          <TextField
            ref={refs.name}
            label="Nome completo"
            name="name"
            autoComplete="name"
            autoCapitalize="words"
            maxLength={120}
            value={values.name}
            error={fieldErrors.name}
            onChange={(event) => updateField('name', event.target.value)}
            onBlur={() => validateOnBlur('name')}
          />

          <TextField
            ref={refs.email}
            label="E-mail"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="nome@exemplo.com.br"
            value={values.email}
            error={fieldErrors.email}
            onChange={(event) => updateField('email', event.target.value)}
            onBlur={() => validateOnBlur('email')}
          />

          <PasswordField
            ref={refs.password}
            label="Senha"
            name="password"
            autoComplete="new-password"
            value={values.password}
            error={fieldErrors.password}
            hint={PASSWORD_HINT}
            describedBy={values.password ? strengthId : undefined}
            below={<PasswordStrength id={strengthId} password={values.password} />}
            onChange={(event) => updateField('password', event.target.value)}
            onBlur={() => validateOnBlur('password')}
          />
        </div>

        <div className={form.actions}>
          {/* Os documentos ainda não existem: a frase ganha links quando forem publicados. */}
          <p className={styles.legal}>
            Ao criar a conta, você concorda com os Termos de uso e a Política de privacidade.
          </p>
          <Button type="submit" size="lg" fullWidth loading={submitting} loadingLabel="Criando conta…">
            Criar conta
          </Button>
          <p className={form.footnote}>
            Já tem conta? <Link to="/entrar">Entrar</Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
