import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, MapPinPlus, SearchX } from 'lucide-react';
import {
  LocationType,
  type AppointmentDetailDto,
  type AppointmentDto,
  type AppointmentListResponse,
  type LocationDto,
  type LocationListResponse,
  type PatientDetailDto,
} from '@meupaciente/shared';
import { ApiError, apiRequest } from '../../lib/api';
import { formatDate, todayIso } from '../../lib/dates';
import { describeCommonError, type FormMessage } from '../../lib/errors';
import { describePatient, formatAge } from '../../lib/format';
import { useApiQuery } from '../../lib/useApiQuery';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { formatWeight, weighings } from '../../lib/weights';
import { Alert } from '../../components/Alert/Alert';
import { Avatar } from '../../components/Avatar/Avatar';
import { Button, ButtonLink } from '../../components/Button/Button';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { Segmented } from '../../components/Segmented/Segmented';
import { Select } from '../../components/Select/Select';
import { Textarea } from '../../components/Textarea/Textarea';
import { TextField } from '../../components/TextField/TextField';
import { useToast } from '../../components/Toast/Toast';
import { NewLocationDialog } from './NewLocationDialog';
import styles from './AppointmentFormPage.module.css';

// Tecla do atalho de salvar: ⌘ no Mac, Ctrl no resto.
const SAVE_MODIFIER = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

const LOCATION_OPTIONS: { value: LocationType; label: string }[] = [
  { value: LocationType.REGISTERED, label: 'Meus locais' },
  { value: LocationType.AD_HOC, label: 'Outro local' },
  { value: LocationType.HOME_VISIT, label: 'Domicílio' },
];

// Campos de texto clínico, na ordem do atendimento.
type ClinicalField =
  'chiefComplaint' | 'history' | 'diagnosis' | 'treatment' | 'prescription' | 'notes';

interface Values {
  date: string;
  locationType: LocationType | null;
  locationId: string;
  adHocName: string;
  homeAddress: string;
  weight: string;
  chiefComplaint: string;
  history: string;
  diagnosis: string;
  treatment: string;
  prescription: string;
  notes: string;
}

interface FieldErrors {
  date?: string;
  locationType?: string;
  locationId?: string;
  adHocName?: string;
  weight?: string;
}

const EMPTY: Values = {
  date: '',
  locationType: null,
  locationId: '',
  adHocName: '',
  homeAddress: '',
  weight: '',
  chiefComplaint: '',
  history: '',
  diagnosis: '',
  treatment: '',
  prescription: '',
  notes: '',
};

/** "4,4" ou "4.4" → 4.4. Vazio → null. Texto inválido → NaN. */
function parseWeight(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!normalized) return null;
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN;
}

function validate(values: Values): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.date) errors.date = 'Informe a data do atendimento.';
  else if (values.date > todayIso()) errors.date = 'A data não pode estar no futuro.';

  if (!values.locationType) errors.locationType = 'Escolha onde foi o atendimento.';
  if (values.locationType === LocationType.REGISTERED && !values.locationId) {
    errors.locationId = 'Escolha o local ou cadastre um novo.';
  }
  if (values.locationType === LocationType.AD_HOC && !values.adHocName.trim()) {
    errors.adHocName = 'Informe o nome do local.';
  }

  const weight = parseWeight(values.weight);
  if (weight !== null) {
    if (Number.isNaN(weight)) errors.weight = 'Informe o peso em kg, por exemplo 4,4.';
    else if (weight < 0.1 || weight > 100)
      errors.weight = 'O peso precisa estar entre 0,1 e 100 kg.';
    // O banco guarda duas casas decimais (Decimal 5,2).
    else if (!/^\d+([.,]\d{1,2})?$/.test(values.weight.trim())) {
      errors.weight = 'Use no máximo duas casas decimais.';
    }
  }
  return errors;
}

function fromAppointment(appointment: AppointmentDto): Values {
  const weight = appointment.weight_kg;
  return {
    date: appointment.date,
    locationType: appointment.location_type,
    locationId: appointment.location_id ?? '',
    adHocName: appointment.ad_hoc_location_name ?? '',
    homeAddress: appointment.home_address ?? '',
    weight: weight !== null ? String(weight).replace('.', ',') : '',
    chiefComplaint: appointment.chief_complaint ?? '',
    history: appointment.history ?? '',
    diagnosis: appointment.diagnosis ?? '',
    treatment: appointment.treatment ?? '',
    prescription: appointment.prescription ?? '',
    notes: appointment.notes ?? '',
  };
}

/**
 * Novo atendimento e edição (mesmo formulário). Grupos do DS: quando e onde,
 * avaliação e conduta. ⌘↵ / Ctrl+Enter salva de qualquer campo.
 */
export function AppointmentFormPage() {
  const { patientId = '', appointmentId } = useParams();
  const editing = Boolean(appointmentId);
  useDocumentTitle(editing ? 'Editar atendimento' : 'Novo atendimento');
  const navigate = useNavigate();
  const showToast = useToast();

  const patientQuery = useApiQuery<PatientDetailDto>(`/patients/${patientId}`);
  const locationsQuery = useApiQuery<LocationListResponse>('/locations?per_page=100');
  // Novo: os atendimentos recentes dão a última pesagem e o último local usado.
  // Edição: o próprio atendimento.
  const recentQuery = useApiQuery<AppointmentListResponse>(
    `/appointments?patient_id=${patientId}&per_page=20`,
  );
  const appointmentQuery = useApiQuery<AppointmentDetailDto | null>(
    editing ? `/appointments/${appointmentId}` : null,
  );

  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [values, setValues] = useState<Values>(EMPTY);
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [saving, setSaving] = useState(false);
  const [creatingLocation, setCreatingLocation] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLSelectElement>(null);
  const adHocRef = useRef<HTMLInputElement>(null);
  const weightRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (locationsQuery.data) setLocations(locationsQuery.data.data);
  }, [locationsQuery.data]);

  // Preenche o formulário uma vez, quando os dados necessários chegam.
  useEffect(() => {
    if (ready || !locationsQuery.data || !recentQuery.data) return;
    if (editing) {
      if (!appointmentQuery.data) return;
      setValues(fromAppointment(appointmentQuery.data));
    } else {
      const saved = locationsQuery.data.data;
      const lastRegistered = recentQuery.data.data.find(
        (appointment) => appointment.location_type === LocationType.REGISTERED,
      )?.location_id;
      // Sugere o local do último atendimento; com um local só, ele mesmo.
      const suggested =
        saved.find((location) => location.id === lastRegistered) ??
        (saved.length === 1 ? saved[0] : null);
      setValues({
        ...EMPTY,
        date: todayIso(),
        locationType: saved.length ? LocationType.REGISTERED : null,
        locationId: suggested?.id ?? '',
      });
    }
    setReady(true);
  }, [ready, editing, locationsQuery.data, recentQuery.data, appointmentQuery.data]);

  function update<K extends keyof Values>(field: K, value: Values[K]) {
    const next = { ...values, [field]: value };
    setValues(next);
    setFormMessage(null);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const found = validate(values);
    setErrors(found);
    const firstInvalid =
      (found.date && dateRef) ||
      (found.locationId && locationRef) ||
      (found.adHocName && adHocRef) ||
      (found.weight && weightRef);
    if (found.locationType) return document.getElementById('local-atendimento')?.focus();
    if (firstInvalid) return firstInvalid.current?.focus();

    const weight = parseWeight(values.weight);
    const text = (field: ClinicalField) => values[field].trim() || null;
    const locationFields = {
      location_type: values.locationType!,
      location_id: values.locationType === LocationType.REGISTERED ? values.locationId : null,
      ad_hoc_location_name:
        values.locationType === LocationType.AD_HOC ? values.adHocName.trim() : null,
      home_address:
        values.locationType === LocationType.HOME_VISIT ? values.homeAddress.trim() || null : null,
    };
    const clinical = {
      weight_kg: weight,
      chief_complaint: text('chiefComplaint'),
      history: text('history'),
      diagnosis: text('diagnosis'),
      treatment: text('treatment'),
      prescription: text('prescription'),
      notes: text('notes'),
    };

    setSaving(true);
    setFormMessage(null);
    try {
      const saved = editing
        ? await apiRequest<AppointmentDto>(`/appointments/${appointmentId}`, {
            method: 'PATCH',
            body: { date: values.date, ...locationFields, ...clinical },
          })
        : await apiRequest<AppointmentDto>('/appointments', {
            method: 'POST',
            // No cadastro, campos vazios simplesmente não vão.
            body: Object.fromEntries(
              Object.entries({
                patient_id: patientId,
                date: values.date,
                ...locationFields,
                ...clinical,
              }).filter(([, value]) => value !== null),
            ),
          });
      showToast({
        tone: 'success',
        title: editing ? 'Atendimento atualizado' : 'Atendimento registrado',
      });
      navigate(`/pacientes/${patientId}?aba=historico&atendimento=${saved.id}`, {
        replace: editing,
      });
    } catch (error) {
      setSaving(false);
      if (error instanceof ApiError && error.status === 404) {
        setFormMessage({
          tone: 'error',
          title: 'O local escolhido não existe mais',
          description: 'Escolha outro local ou cadastre um novo.',
        });
      } else {
        setFormMessage(describeCommonError(error));
      }
      messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // DS: ⌘↵ / Ctrl+Enter salva o formulário de qualquer campo.
  function handleShortcut(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  const patient = patientQuery.data;
  const notFound =
    (patientQuery.error instanceof ApiError && [400, 404].includes(patientQuery.error.status)) ||
    (appointmentQuery.error instanceof ApiError &&
      [400, 404].includes(appointmentQuery.error.status)) ||
    (appointmentQuery.data && appointmentQuery.data.patient_id !== patientId);
  const recordPath = `/pacientes/${patientId}`;

  if (notFound) {
    return (
      <div className={styles.page}>
        <EmptyState
          icon={<SearchX size={24} strokeWidth={1.75} />}
          title={editing ? 'Atendimento não encontrado' : 'Paciente não encontrado'}
          description="Ele pode ter sido excluído, ou o endereço está incompleto."
          action={<ButtonLink to="/pacientes">Voltar para pacientes</ButtonLink>}
        />
      </div>
    );
  }

  const loadError =
    patientQuery.error || locationsQuery.error || recentQuery.error || appointmentQuery.error;
  if (loadError) {
    return (
      <div className={styles.page}>
        <Alert tone="error" title="Não foi possível abrir o formulário">
          Verifique sua conexão e recarregue a página.
        </Alert>
      </div>
    );
  }

  if (!patient || !ready) {
    return (
      <div className={styles.page} role="status">
        <span className="visually-hidden">Carregando formulário</span>
        <div className={styles.loading} aria-hidden="true" />
      </div>
    );
  }

  const lastWeight = weighings(recentQuery.data?.data ?? [])
    .filter((point) => point.appointmentId !== appointmentId)
    .at(-1);
  const patientDetails = [describePatient(patient), formatAge(patient.birth_date)]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={styles.page}>
      <nav aria-label="Você está em" className={styles.breadcrumb}>
        <Link to="/pacientes">Pacientes</Link>
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        <Link to={recordPath}>{patient.name}</Link>
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        <span aria-current="page">{editing ? 'Editar atendimento' : 'Novo atendimento'}</span>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>{editing ? 'Editar atendimento' : 'Novo atendimento'}</h1>
        <div className={styles.patient}>
          <Avatar name={patient.name} kind="patient" photoUrl={patient.photo_url} />
          <div className={styles.patientText}>
            <span className={styles.patientName}>{patient.name}</span>
            <span className={styles.patientMeta}>
              {[patientDetails, `Tutor: ${patient.tutor.name}`].filter(Boolean).join(' · ')}
            </span>
          </div>
        </div>
      </header>

      <form
        ref={formRef}
        className={styles.form}
        noValidate
        onSubmit={handleSubmit}
        onKeyDown={handleShortcut}
      >
        {formMessage && (
          <div ref={messageRef}>
            <Alert tone={formMessage.tone} title={formMessage.title}>
              {formMessage.description}
            </Alert>
          </div>
        )}

        <section className={styles.card} aria-labelledby="grupo-quando-onde">
          <h2 id="grupo-quando-onde" className={styles.sectionTitle}>
            Quando e onde
          </h2>
          <div className={styles.grid}>
            <TextField
              ref={dateRef}
              label="Data"
              name="date"
              type="date"
              max={todayIso()}
              value={values.date}
              error={errors.date}
              onChange={(event) => update('date', event.target.value)}
            />
            <TextField
              ref={weightRef}
              label="Peso"
              optional
              name="weight"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,0"
              className={styles.weight}
              trailing={<span className={styles.unit}>kg</span>}
              value={values.weight}
              error={errors.weight}
              hint={
                lastWeight
                  ? `Última pesagem: ${formatWeight(lastWeight.weight)} em ${formatDate(lastWeight.date)}.`
                  : undefined
              }
              onChange={(event) => update('weight', event.target.value)}
            />
          </div>

          <div id="local-atendimento" tabIndex={-1} className={styles.location}>
            <Segmented
              legend="Onde foi o atendimento?"
              name="location-type"
              options={LOCATION_OPTIONS}
              value={values.locationType}
              onChange={(type) => update('locationType', type)}
            >
              <div className={styles.locationFields}>
                {errors.locationType && <p className={styles.fieldError}>{errors.locationType}</p>}

                {values.locationType === LocationType.REGISTERED &&
                  (locations.length ? (
                    <Select
                      ref={locationRef}
                      label="Local"
                      name="location"
                      value={values.locationId}
                      error={errors.locationId}
                      onChange={(event) => update('locationId', event.target.value)}
                      labelAction={
                        <button
                          type="button"
                          className={styles.inlineAction}
                          onClick={() => setCreatingLocation(true)}
                        >
                          Cadastrar novo local
                        </button>
                      }
                    >
                      <option value="" disabled>
                        Escolha um local
                      </option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <div className={styles.noLocations}>
                      <p>
                        Você ainda não tem locais salvos. Cadastre a clínica ou o consultório onde
                        atende.
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<MapPinPlus size={16} strokeWidth={1.75} aria-hidden="true" />}
                        onClick={() => setCreatingLocation(true)}
                      >
                        Cadastrar local
                      </Button>
                      {errors.locationId && (
                        <p className={styles.fieldError}>{errors.locationId}</p>
                      )}
                    </div>
                  ))}

                {values.locationType === LocationType.AD_HOC && (
                  <TextField
                    ref={adHocRef}
                    label="Nome do local"
                    name="ad-hoc-location"
                    maxLength={120}
                    placeholder="Ex.: Petshop Amigo Fiel"
                    value={values.adHocName}
                    error={errors.adHocName}
                    hint="Vale só para este atendimento. Para reutilizar, use Meus locais."
                    onChange={(event) => update('adHocName', event.target.value)}
                  />
                )}

                {values.locationType === LocationType.HOME_VISIT && (
                  <TextField
                    label="Endereço"
                    optional
                    name="home-address"
                    maxLength={255}
                    value={values.homeAddress}
                    onChange={(event) => update('homeAddress', event.target.value)}
                  />
                )}
              </div>
            </Segmented>
          </div>
        </section>

        <section className={styles.card} aria-labelledby="grupo-avaliacao">
          <h2 id="grupo-avaliacao" className={styles.sectionTitle}>
            Avaliação
          </h2>
          <div className={styles.stack}>
            <Textarea
              label="Queixa principal"
              optional
              name="chief-complaint"
              minRows={2}
              maxLength={500}
              value={values.chiefComplaint}
              onChange={(event) => update('chiefComplaint', event.target.value)}
            />
            <Textarea
              label="Anamnese"
              optional
              name="history"
              value={values.history}
              onChange={(event) => update('history', event.target.value)}
            />
            <Textarea
              label="Diagnóstico"
              optional
              name="diagnosis"
              minRows={2}
              value={values.diagnosis}
              onChange={(event) => update('diagnosis', event.target.value)}
            />
          </div>
        </section>

        <section className={styles.card} aria-labelledby="grupo-conduta">
          <h2 id="grupo-conduta" className={styles.sectionTitle}>
            Conduta
          </h2>
          <div className={styles.stack}>
            <Textarea
              label="Tratamento"
              optional
              name="treatment"
              value={values.treatment}
              onChange={(event) => update('treatment', event.target.value)}
            />
            <Textarea
              label="Prescrição"
              optional
              name="prescription"
              className={styles.prescription}
              hint="Um item por linha: medicamento, dose, frequência e duração."
              value={values.prescription}
              onChange={(event) => update('prescription', event.target.value)}
            />
            <Textarea
              label="Observações"
              optional
              name="notes"
              minRows={2}
              value={values.notes}
              onChange={(event) => update('notes', event.target.value)}
            />
          </div>
        </section>

        <div className={styles.actions}>
          <ButtonLink to={recordPath} variant="ghost" className={styles.cancel}>
            Cancelar
          </ButtonLink>
          <span className={styles.shortcut} aria-hidden="true">
            <kbd>{SAVE_MODIFIER}</kbd>
            <kbd>↵</kbd> salva
          </span>
          <Button type="submit" loading={saving} loadingLabel="Salvando…">
            {editing ? 'Salvar alterações' : 'Salvar atendimento'}
          </Button>
        </div>
      </form>

      <NewLocationDialog
        open={creatingLocation}
        onClose={() => setCreatingLocation(false)}
        onCreated={(location) => {
          setCreatingLocation(false);
          setLocations((current) => [location, ...current]);
          setValues((current) => ({
            ...current,
            locationType: LocationType.REGISTERED,
            locationId: location.id,
          }));
          setErrors((current) => ({ ...current, locationId: undefined, locationType: undefined }));
          showToast({ tone: 'success', title: `${location.name} salvo nos seus locais` });
        }}
      />
    </div>
  );
}
