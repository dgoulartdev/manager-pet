import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, SearchX } from 'lucide-react';
import { Sex, type PatientDetailDto, type PatientDto, type TutorDto } from '@meupaciente/shared';
import { ApiError, apiRequest } from '../../lib/api';
import { describeCommonError, type FormMessage } from '../../lib/errors';
import { todayIso } from '../../lib/dates';
import { formatAge, formatPhone } from '../../lib/format';
import { useApiQuery } from '../../lib/useApiQuery';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { Alert } from '../../components/Alert/Alert';
import { Avatar } from '../../components/Avatar/Avatar';
import { Button, ButtonLink } from '../../components/Button/Button';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { PhotoPicker } from '../../components/PhotoPicker/PhotoPicker';
import { Segmented } from '../../components/Segmented/Segmented';
import { TextField } from '../../components/TextField/TextField';
import { useToast } from '../../components/Toast/Toast';
import { TutorPicker, type TutorPickerHandle } from '../../components/TutorPicker/TutorPicker';
import styles from './PatientFormPage.module.css';

type SpeciesChoice = 'dog' | 'cat' | 'other';

// A espécie é texto livre na API (ADR-008); estes são os valores iniciais do produto.
const SPECIES_VALUES: Record<Exclude<SpeciesChoice, 'other'>, string> = { dog: 'Cão', cat: 'Gato' };

const SPECIES_OPTIONS: { value: SpeciesChoice; label: string }[] = [
  { value: 'dog', label: 'Cão' },
  { value: 'cat', label: 'Gato' },
  { value: 'other', label: 'Outra' },
];

// Sem opção "não sei": o animal é macho ou fêmea. Se ainda não foi informado,
// o campo fica vazio e a API grava UNKNOWN ("não informado").
const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: Sex.MALE, label: 'Macho' },
  { value: Sex.FEMALE, label: 'Fêmea' },
];

interface FormValues {
  name: string;
  species: SpeciesChoice | null;
  otherSpecies: string;
  sex: Sex | null;
  birthDate: string;
  breed: string;
  color: string;
  tutor: TutorDto | null;
  photo: File | null;
}

interface FieldErrors {
  name?: string;
  otherSpecies?: string;
  birthDate?: string;
  tutor?: string;
}

const EMPTY_FORM: FormValues = {
  name: '',
  species: null,
  otherSpecies: '',
  sex: null,
  birthDate: '',
  breed: '',
  color: '',
  tutor: null,
  photo: null,
};

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.name.trim()) errors.name = 'Informe o nome do paciente.';
  if (values.species === 'other' && !values.otherSpecies.trim()) {
    errors.otherSpecies = 'Informe a espécie ou escolha Cão ou Gato.';
  }
  if (values.birthDate && values.birthDate > todayIso()) {
    errors.birthDate = 'A data de nascimento não pode ser no futuro.';
  }
  if (!values.tutor) errors.tutor = 'Escolha o tutor ou cadastre um novo.';
  return errors;
}

// Edição: a espécie (texto livre na API) volta para Cão, Gato ou Outra.
function fromPatient(patient: PatientDetailDto): FormValues {
  const species = patient.species?.trim() ?? '';
  const known = (Object.keys(SPECIES_VALUES) as (keyof typeof SPECIES_VALUES)[]).find(
    (choice) => SPECIES_VALUES[choice].toLowerCase() === species.toLowerCase(),
  );
  return {
    name: patient.name,
    species: known ?? (species ? 'other' : null),
    otherSpecies: known ? '' : species,
    sex: patient.sex === Sex.UNKNOWN ? null : patient.sex,
    birthDate: patient.birth_date ?? '',
    breed: patient.breed ?? '',
    color: patient.color ?? '',
    tutor: patient.tutor,
    photo: null,
  };
}

function speciesToApi(values: FormValues): string | undefined {
  if (values.species === 'other') return values.otherSpecies.trim();
  return values.species ? SPECIES_VALUES[values.species] : undefined;
}

// "Mimi cadastrada" / "Rex cadastrado": concorda com o sexo quando ele é conhecido.
function registeredMessage(name: string, sex: Sex | null): string {
  return `${name} ${sex === Sex.FEMALE ? 'cadastrada' : 'cadastrado'}`;
}

/**
 * Cadastro e edição de paciente (mesmo formulário). Na edição o tutor fica
 * fixo: a API não troca o tutor de um paciente.
 */
export function PatientFormPage() {
  const { patientId } = useParams();
  const editing = Boolean(patientId);
  useDocumentTitle(editing ? 'Editar paciente' : 'Novo paciente');
  const navigate = useNavigate();
  const showToast = useToast();

  const patientQuery = useApiQuery<PatientDetailDto>(editing ? `/patients/${patientId}` : null);
  const [ready, setReady] = useState(!editing);
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  // Qual botão enviou: "salvar" abre o prontuário; "salvar e cadastrar outro" limpa o form.
  const [submitting, setSubmitting] = useState<'open' | 'another' | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const otherSpeciesRef = useRef<HTMLInputElement>(null);
  const birthDateRef = useRef<HTMLInputElement>(null);
  const tutorRef = useRef<TutorPickerHandle>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Edição: preenche o formulário uma vez, quando o paciente chega.
  useEffect(() => {
    if (ready || !patientQuery.data) return;
    setValues(fromPatient(patientQuery.data));
    setReady(true);
  }, [ready, patientQuery.data]);

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    const next = { ...values, [field]: value };
    setValues(next);
    setFormMessage(null);
    // Com erro visível, revalida para o erro sumir assim que for corrigido.
    if (Object.values(errors).some(Boolean)) {
      const revalidated = validate(next);
      setErrors((current) => {
        const kept: FieldErrors = {};
        for (const key of Object.keys(current) as (keyof FieldErrors)[]) {
          if (current[key]) kept[key] = revalidated[key];
        }
        return kept;
      });
    }
  }

  async function save(mode: 'open' | 'another') {
    if (submitting) return;
    const found = validate(values);
    setErrors(found);
    if (found.name) return nameRef.current?.focus();
    if (found.otherSpecies) return otherSpeciesRef.current?.focus();
    if (found.birthDate) return birthDateRef.current?.focus();
    if (found.tutor) return tutorRef.current?.focus();

    setSubmitting(mode);
    setFormMessage(null);
    let patient: PatientDto;
    try {
      patient = editing
        ? await apiRequest<PatientDto>(`/patients/${patientId}`, {
            method: 'PATCH',
            // Campo esvaziado vai como null e limpa o valor salvo. Sexo sem
            // escolha não vai: o que está gravado continua.
            body: {
              name: values.name.trim(),
              species: speciesToApi(values) ?? null,
              sex: values.sex ?? undefined,
              birth_date: values.birthDate || null,
              breed: values.breed.trim() || null,
              color: values.color.trim() || null,
            },
          })
        : await apiRequest<PatientDto>('/patients', {
            method: 'POST',
            body: {
              tutor_id: values.tutor!.id,
              name: values.name.trim(),
              species: speciesToApi(values),
              sex: values.sex ?? undefined,
              birth_date: values.birthDate || undefined,
              breed: values.breed.trim() || undefined,
              color: values.color.trim() || undefined,
            },
          });
    } catch (error) {
      setSubmitting(null);
      if (editing && error instanceof ApiError && error.status === 404) {
        setFormMessage({
          tone: 'error',
          title: 'Este paciente não existe mais',
          description: 'Ele pode ter sido excluído em outra aba ou aparelho.',
        });
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (error instanceof ApiError && error.status === 404) {
        // O tutor foi removido enquanto o formulário estava aberto.
        setValues((current) => ({ ...current, tutor: null }));
        setErrors({ tutor: 'Este tutor não foi encontrado. Escolha outro.' });
        return;
      }
      setFormMessage(describeCommonError(error));
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // A foto só sobe depois (a API precisa do id). Se falhar, o cadastro continua valendo.
    let photoFailed = false;
    if (values.photo) {
      const upload = new FormData();
      upload.append('photo', values.photo);
      try {
        await apiRequest(`/patients/${patient.id}/photo`, { method: 'PUT', body: upload });
      } catch {
        photoFailed = true;
      }
    }

    const title = editing
      ? `Dados de ${patient.name} atualizados`
      : registeredMessage(patient.name, values.sex);
    if (photoFailed) {
      showToast({
        tone: 'warning',
        title: `${title}, mas a foto não foi enviada`,
        description: 'Tente enviar a foto de novo pelo prontuário.',
      });
    }

    if (mode === 'another') {
      if (!photoFailed) {
        showToast({
          tone: 'success',
          title,
          description: 'Pronto para o próximo, com o mesmo tutor.',
        });
      }
      // Cenário comum: vários animais do mesmo tutor em sequência.
      setValues({ ...EMPTY_FORM, tutor: values.tutor });
      setErrors({});
      setSubmitting(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      nameRef.current?.focus();
      return;
    }

    if (!photoFailed) showToast({ tone: 'success', title });
    // Na edição, voltar do prontuário não reabre o formulário já salvo.
    navigate(`/pacientes/${patient.id}`, { replace: editing });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save('open');
  }

  const loadError = patientQuery.error;
  if (loadError instanceof ApiError && [400, 404].includes(loadError.status)) {
    return (
      <div className={styles.page}>
        <EmptyState
          icon={<SearchX size={24} strokeWidth={1.75} />}
          title="Paciente não encontrado"
          description="Ele pode ter sido excluído, ou o endereço está incompleto."
          action={<ButtonLink to="/pacientes">Voltar para pacientes</ButtonLink>}
        />
      </div>
    );
  }
  if (loadError) {
    return (
      <div className={styles.page}>
        <Alert tone="error" title="Não foi possível abrir o formulário">
          Verifique sua conexão e recarregue a página.
        </Alert>
      </div>
    );
  }
  if (!ready) {
    return (
      <div className={styles.page} role="status">
        <span className="visually-hidden">Carregando formulário</span>
        <div className={styles.loading} aria-hidden="true" />
      </div>
    );
  }

  const age = formatAge(values.birthDate || null);
  const recordPath = `/pacientes/${patientId}`;
  const heading = editing ? 'Editar paciente' : 'Novo paciente';

  return (
    <div className={styles.page} ref={topRef}>
      <nav aria-label="Você está em" className={styles.breadcrumb}>
        <Link to="/pacientes">Pacientes</Link>
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        {editing && patientQuery.data && (
          <>
            <Link to={recordPath}>{patientQuery.data.name}</Link>
            <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </>
        )}
        <span aria-current="page">{heading}</span>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>{heading}</h1>
        <p className={styles.subtitle}>
          {editing
            ? 'Só o nome é obrigatório. O tutor continua o mesmo do cadastro.'
            : 'Só nome e tutor são obrigatórios. O resto você completa no primeiro atendimento.'}
        </p>
      </header>

      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        {formMessage && (
          <div className={styles.message}>
            <Alert tone={formMessage.tone} title={formMessage.title}>
              {formMessage.description}
            </Alert>
          </div>
        )}

        <div className={styles.main}>
          <section className={styles.card} aria-labelledby="secao-identificacao">
            <h2 id="secao-identificacao" className={styles.sectionTitle}>
              Identificação
            </h2>
            <div className={styles.grid}>
              <TextField
                ref={nameRef}
                label="Nome"
                name="name"
                autoComplete="off"
                autoCapitalize="words"
                maxLength={120}
                value={values.name}
                error={errors.name}
                onChange={(event) => update('name', event.target.value)}
              />
              <Segmented
                legend="Espécie"
                optional
                name="species"
                options={SPECIES_OPTIONS}
                value={values.species}
                onChange={(species) => update('species', species)}
              >
                {values.species === 'other' && (
                  <TextField
                    ref={otherSpeciesRef}
                    label="Qual espécie?"
                    name="other-species"
                    maxLength={60}
                    placeholder="Ex.: calopsita, coelho"
                    value={values.otherSpecies}
                    error={errors.otherSpecies}
                    onChange={(event) => update('otherSpecies', event.target.value)}
                  />
                )}
              </Segmented>
              <Segmented
                legend="Sexo"
                optional
                name="sex"
                options={SEX_OPTIONS}
                value={values.sex}
                onChange={(sex) => update('sex', sex)}
              />
              <TextField
                ref={birthDateRef}
                label="Data de nascimento"
                optional
                name="birth-date"
                type="date"
                max={todayIso()}
                value={values.birthDate}
                error={errors.birthDate}
                hint={age ? `Idade: ${age}.` : undefined}
                onChange={(event) => update('birthDate', event.target.value)}
              />
              <TextField
                label="Raça"
                optional
                name="breed"
                maxLength={60}
                placeholder="Ex.: SRD, Siamês, Labrador"
                value={values.breed}
                onChange={(event) => update('breed', event.target.value)}
              />
              <TextField
                label="Pelagem"
                optional
                name="color"
                maxLength={60}
                placeholder="Ex.: rajada cinza"
                value={values.color}
                onChange={(event) => update('color', event.target.value)}
              />
            </div>
          </section>

          <section className={styles.card} aria-labelledby="secao-tutor">
            <h2 id="secao-tutor" className={styles.sectionTitle}>
              Tutor
            </h2>
            {editing && values.tutor ? (
              <FixedTutor tutor={values.tutor} />
            ) : (
              <TutorPicker
                ref={tutorRef}
                labelHidden
                value={values.tutor}
                error={errors.tutor}
                onChange={(tutor) => update('tutor', tutor)}
              />
            )}
          </section>
        </div>

        <aside className={styles.side}>
          <div className={styles.card}>
            <PhotoPicker
              file={values.photo}
              currentUrl={patientQuery.data?.photo_url}
              onChange={(photo) => update('photo', photo)}
            />
          </div>
        </aside>

        <div className={styles.actions}>
          <ButtonLink
            to={editing ? recordPath : '/pacientes'}
            variant="ghost"
            className={styles.cancel}
          >
            Cancelar
          </ButtonLink>
          {!editing && (
            <Button
              variant="secondary"
              className={styles.saveAnother}
              loading={submitting === 'another'}
              loadingLabel="Salvando…"
              onClick={() => void save('another')}
            >
              Salvar e cadastrar outro
            </Button>
          )}
          <Button type="submit" loading={submitting === 'open'} loadingLabel="Salvando…">
            {editing ? 'Salvar alterações' : 'Salvar paciente'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Edição: o tutor aparece, mas não muda. O contato dele se corrige na tela de tutores.
function FixedTutor({ tutor }: { tutor: TutorDto }) {
  const phone = formatPhone(tutor.phone);

  return (
    <div className={styles.fixedTutor}>
      <div className={styles.tutorRow}>
        <Avatar name={tutor.name} kind="person" />
        <div className={styles.tutorText}>
          <span className={styles.tutorName}>{tutor.name}</span>
          {phone && <span className={styles.tutorPhone}>{phone}</span>}
        </div>
      </div>
      <p className={styles.tutorNote}>
        O tutor não muda depois do cadastro. Para corrigir telefone ou e-mail,{' '}
        <Link to={`/tutores?q=${encodeURIComponent(tutor.name)}`}>edite em Tutores</Link>.
      </p>
    </div>
  );
}
