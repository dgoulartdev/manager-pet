import { useMemo, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight, Plus, RotateCw, SearchX } from 'lucide-react';
import type {
  AppointmentListResponse,
  LocationListResponse,
  PatientDetailDto,
  VaccineListResponse,
} from '@meupaciente/shared';
import { ApiError } from '../../lib/api';
import { describePatient, formatAge, formatPhone } from '../../lib/format';
import { useApiQuery } from '../../lib/useApiQuery';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { withVaccineStatus, worstVaccineStatus, type VaccineStatus } from '../../lib/vaccines';
import { Alert } from '../../components/Alert/Alert';
import { Avatar } from '../../components/Avatar/Avatar';
import { Badge, type BadgeTone } from '../../components/Badge/Badge';
import { Button, ButtonLink } from '../../components/Button/Button';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { panelId, tabId, Tabs } from '../../components/Tabs/Tabs';
import { SummaryCards } from './SummaryCards';
import { OverviewTab } from './tabs/OverviewTab';
import { HistoryTab } from './tabs/HistoryTab';
import { VaccinesTab } from './tabs/VaccinesTab';
import { WeightTab } from './tabs/WeightTab';
import styles from './PatientRecordPage.module.css';

// A API aceita até 100 por página; é mais que o histórico de quase todo paciente.
const HISTORY_LIMIT = 100;
const TABS_ID = 'prontuario';

type TabKey = 'dados' | 'historico' | 'vacinas' | 'pesagens';
const TAB_KEYS: TabKey[] = ['dados', 'historico', 'vacinas', 'pesagens'];

const HEADER_STATUS: Partial<Record<VaccineStatus, { tone: BadgeTone; label: string }>> = {
  overdue: { tone: 'error', label: 'Vacina atrasada' },
  'due-soon': { tone: 'warning', label: 'Vacina a vencer' },
  'up-to-date': { tone: 'success', label: 'Vacinas em dia' },
};

export function PatientRecordPage() {
  const { patientId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('aba') as TabKey | null;
  const tab: TabKey = requestedTab && TAB_KEYS.includes(requestedTab) ? requestedTab : 'dados';

  const patientQuery = useApiQuery<PatientDetailDto>(`/patients/${patientId}`);
  const appointmentsQuery = useApiQuery<AppointmentListResponse>(
    `/appointments?patient_id=${patientId}&per_page=${HISTORY_LIMIT}`,
  );
  const vaccinesQuery = useApiQuery<VaccineListResponse>(
    `/vaccines?patient_id=${patientId}&per_page=${HISTORY_LIMIT}`,
  );
  const locationsQuery = useApiQuery<LocationListResponse>('/locations?per_page=100');

  const patient = patientQuery.data;
  useDocumentTitle(patient?.name ?? 'Prontuário');

  const appointments = appointmentsQuery.data?.data;
  const vaccines = useMemo(
    () => (vaccinesQuery.data ? withVaccineStatus(vaccinesQuery.data.data) : undefined),
    [vaccinesQuery.data],
  );
  const locationNames = useMemo(
    () =>
      new Map((locationsQuery.data?.data ?? []).map((location) => [location.id, location.name])),
    [locationsQuery.data],
  );

  function changeTab(next: TabKey) {
    setSearchParams(next === 'dados' ? {} : { aba: next }, { replace: true });
  }

  // Id inválido (400) ou paciente de outro usuário / apagado (404): página inteira de erro.
  const error = patientQuery.error;
  if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
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

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>
          <Alert tone="error" title="Não foi possível abrir o prontuário">
            Verifique sua conexão e tente de novo.
          </Alert>
          <Button
            variant="secondary"
            icon={<RotateCw size={18} strokeWidth={1.75} aria-hidden="true" />}
            onClick={patientQuery.retry}
          >
            Tentar de novo
          </Button>
        </div>
      </div>
    );
  }

  if (!patient) return <RecordSkeleton />;

  const age = formatAge(patient.birth_date);
  const details = [describePatient(patient), age].filter(Boolean).join(' · ');
  const vaccineStatus = vaccines ? worstVaccineStatus(vaccines) : null;
  const statusBadge = vaccineStatus ? HEADER_STATUS[vaccineStatus] : undefined;
  const newAppointmentPath = `/pacientes/${patient.id}/atendimentos/novo`;

  return (
    <div className={styles.page}>
      <nav aria-label="Você está em" className={styles.breadcrumb}>
        <Link to="/pacientes">Pacientes</Link>
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        <span aria-current="page">{patient.name}</span>
      </nav>

      <header className={styles.header}>
        <Avatar name={patient.name} kind="patient" photoUrl={patient.photo_url} size="xl" />
        <div className={styles.identity}>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>{patient.name}</h1>
            {statusBadge && <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>}
          </div>
          {details && <p className={styles.details}>{details}</p>}
          <p className={styles.tutor}>
            Tutor: <span className={styles.tutorName}>{patient.tutor.name}</span>
            {patient.tutor.phone && (
              <>
                {' · '}
                <a href={`tel:${patient.tutor.phone}`} className={styles.phone}>
                  {formatPhone(patient.tutor.phone)}
                </a>
              </>
            )}
          </p>
        </div>
        <ButtonLink
          to={newAppointmentPath}
          className={styles.primaryAction}
          icon={<Plus size={18} strokeWidth={2} aria-hidden="true" />}
        >
          Novo atendimento
        </ButtonLink>
      </header>

      <SummaryCards
        appointments={appointments}
        vaccines={vaccines}
        onOpenTab={(target) => changeTab(target)}
      />

      <Tabs
        idPrefix={TABS_ID}
        label="Seções do prontuário"
        value={tab}
        onChange={changeTab}
        items={[
          { id: 'dados', label: 'Dados' },
          { id: 'historico', label: 'Histórico', count: appointments?.length },
          { id: 'vacinas', label: 'Vacinas', count: vaccines?.length },
          {
            id: 'pesagens',
            label: 'Pesagens',
            count: appointments?.filter((appointment) => appointment.weight_kg !== null).length,
          },
        ]}
      />

      <section
        role="tabpanel"
        id={panelId(TABS_ID, tab)}
        aria-labelledby={tabId(TABS_ID, tab)}
        className={styles.panel}
      >
        {tab === 'dados' && (
          <OverviewTab
            patient={patient}
            appointmentsCount={appointments?.length}
            vaccinesCount={vaccines?.length}
            onPhotoChanged={patientQuery.retry}
          />
        )}
        {tab === 'historico' && (
          <SectionState query={appointmentsQuery} what="o histórico">
            {appointments && (
              <HistoryTab
                appointments={appointments}
                locationNames={locationNames}
                vaccines={vaccines}
                patientId={patient.id}
                newAppointmentPath={newAppointmentPath}
                onChanged={() => {
                  appointmentsQuery.retry();
                  // A API desfaz o vínculo das vacinas do atendimento excluído.
                  vaccinesQuery.retry();
                }}
              />
            )}
          </SectionState>
        )}
        {tab === 'vacinas' && (
          <SectionState query={vaccinesQuery} what="as vacinas">
            {vaccines && (
              <VaccinesTab
                patient={patient}
                vaccines={vaccines}
                appointments={appointments}
                onChanged={vaccinesQuery.retry}
              />
            )}
          </SectionState>
        )}
        {tab === 'pesagens' && (
          <SectionState query={appointmentsQuery} what="as pesagens">
            {appointments && (
              <WeightTab appointments={appointments} newAppointmentPath={newAppointmentPath} />
            )}
          </SectionState>
        )}
      </section>
    </div>
  );
}

interface SectionStateProps {
  query: { data: unknown; error: unknown; retry: () => void };
  what: string;
  children: ReactNode;
}

// Erro por seção: uma aba que falha não derruba o resto do prontuário.
function SectionState({ query, what, children }: SectionStateProps) {
  if (query.error) {
    return (
      <div className={styles.errorBox}>
        <Alert tone="error" title={`Não foi possível carregar ${what}`}>
          Os dados do paciente continuam disponíveis acima.
        </Alert>
        <Button
          variant="secondary"
          icon={<RotateCw size={18} strokeWidth={1.75} aria-hidden="true" />}
          onClick={query.retry}
        >
          Tentar de novo
        </Button>
      </div>
    );
  }
  if (!query.data) {
    return (
      <div className={styles.sectionLoading} role="status">
        <span className="visually-hidden">Carregando {what}</span>
      </div>
    );
  }
  return <>{children}</>;
}

// Esqueleto com a silhueta real: cabeçalho, cards e abas.
function RecordSkeleton() {
  return (
    <div className={styles.page} role="status">
      <span className="visually-hidden">Carregando prontuário</span>
      <div className={styles.skeletonHeader} aria-hidden="true">
        <span className={styles.skeletonAvatar} />
        <span className={styles.skeletonLines}>
          <span />
          <span />
        </span>
      </div>
      <div className={styles.skeletonCards} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
