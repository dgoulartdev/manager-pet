import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Circle,
  CircleCheck,
  ClipboardList,
  PawPrint,
  Plus,
  RotateCw,
} from 'lucide-react';
import type {
  AppointmentListItemDto,
  AppointmentListResponse,
  LocationListResponse,
  PatientListResponse,
  VaccineListItemDto,
  VaccineListResponse,
} from '@meupaciente/shared';
import { useAuth } from '../../auth/AuthContext';
import { appointmentTitle, describeLocation } from '../../lib/appointments';
import {
  formatDate,
  formatDaysAgo,
  formatMonthName,
  formatWeekdayDate,
  isoDateInDays,
  startOfMonth,
} from '../../lib/dates';
import { firstNameOf, formatPhone, greetingFor, pluralize } from '../../lib/format';
import { useApiQuery } from '../../lib/useApiQuery';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import {
  DUE_SOON_DAYS,
  describeVaccineStatus,
  VACCINE_STATUS_TONES,
  withCurrentDoseStatus,
} from '../../lib/vaccines';
import { Alert } from '../../components/Alert/Alert';
import { Avatar } from '../../components/Avatar/Avatar';
import { Badge } from '../../components/Badge/Badge';
import { Button, ButtonLink } from '../../components/Button/Button';
import { ListSkeleton } from '../../components/ListPage/ListSkeleton';
import { Pagination } from '../../components/ListPage/Pagination';
import { SearchField } from '../../components/SearchField/SearchField';
import list from '../../components/ListPage/ListPage.module.css';
import styles from './HomePage.module.css';

// Itens por painel: o início é um resumo; a lista completa fica no prontuário.
const PANEL_SIZE = 5;

/**
 * Primeira tela depois de entrar: quantos pacientes, quais vacinas pedem
 * contato com o tutor e os últimos atendimentos. Sem pacientes, vira o
 * convite para cadastrar o primeiro.
 */
export function HomePage() {
  useDocumentTitle('Início');
  const { state } = useAuth();
  const userName = state.status === 'authenticated' ? state.user.name : '';

  const patientsQuery = useApiQuery<PatientListResponse>('/patients?per_page=1');
  const hasNoPatients = patientsQuery.data?.pagination.total === 0;

  return (
    <div className={list.page}>
      <header className={list.header}>
        <div className={list.heading}>
          <h1 className={list.title}>
            {greetingFor()}, {firstNameOf(userName)}
          </h1>
          <p className={list.subtitle}>{formatWeekdayDate()}</p>
        </div>
        {/* No estado vazio a ação fica no convite: uma ação primária por tela (DS). */}
        {!hasNoPatients && (
          <ButtonLink
            to="/pacientes/novo"
            className={list.headerAction}
            icon={<Plus size={18} strokeWidth={2} aria-hidden="true" />}
          >
            Novo paciente
          </ButtonLink>
        )}
      </header>

      {hasNoPatients ? (
        <FirstSteps />
      ) : (
        <>
          <PatientsCard
            total={patientsQuery.data?.pagination.total}
            failed={Boolean(patientsQuery.error)}
            onRetry={patientsQuery.retry}
          />
          <div className={styles.panels}>
            <DueVaccines />
            <RecentAppointments />
          </div>
        </>
      )}

      {/* Mobile: a ação principal vira botão flutuante acima das abas. */}
      {!hasNoPatients && (
        <Link to="/pacientes/novo" className={list.fab} aria-label="Novo paciente">
          <Plus size={24} strokeWidth={2} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

interface PatientsCardProps {
  // indefinido = ainda carregando
  total: number | undefined;
  failed: boolean;
  onRetry: () => void;
}

/** Total de pacientes, quantos entraram neste mês e a busca que leva à lista. */
function PatientsCard({ total, failed, onRetry }: PatientsCardProps) {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');

  const monthStart = encodeURIComponent(startOfMonth().toISOString());
  const newThisMonth = useApiQuery<PatientListResponse>(
    `/patients?per_page=1&created_from=${monthStart}`,
  ).data?.pagination.total;
  const month = formatMonthName();

  function search(event: FormEvent) {
    event.preventDefault();
    const term = searchText.trim();
    navigate(term ? `/pacientes?${new URLSearchParams({ q: term })}` : '/pacientes');
  }

  return (
    <section className={styles.patientsCard} aria-labelledby="inicio-pacientes">
      <div className={styles.stat}>
        <h2 id="inicio-pacientes" className={styles.statLabel}>
          Pacientes
        </h2>
        {failed ? (
          <div className={styles.statError}>
            <span>Não foi possível carregar o total.</span>
            <Button
              variant="ghost"
              icon={<RotateCw size={18} strokeWidth={1.75} aria-hidden="true" />}
              onClick={onRetry}
            >
              Tentar de novo
            </Button>
          </div>
        ) : total === undefined ? (
          <span className={styles.statLoading} role="status">
            <span className="visually-hidden">Carregando o total de pacientes</span>
          </span>
        ) : (
          <>
            <p className={styles.statNumber}>{total.toLocaleString('pt-BR')}</p>
            <p className={styles.statMeta}>
              {newThisMonth === undefined
                ? ' '
                : newThisMonth === 0
                  ? `Nenhum novo em ${month}`
                  : `${pluralize(newThisMonth, 'novo', 'novos')} em ${month}`}
            </p>
          </>
        )}
      </div>

      <form role="search" className={styles.search} onSubmit={search}>
        <SearchField
          label="Buscar pacientes"
          placeholder="Paciente, tutor ou telefone"
          enterKeyHint="search"
          value={searchText}
          onChange={setSearchText}
        />
      </form>

      <Link to="/pacientes" className={styles.seeAll}>
        Ver todos os pacientes
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
      </Link>
    </section>
  );
}

/** Doses atrasadas ou vencendo em 30 dias: quem precisa de contato com o tutor. */
function DueVaccines() {
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({
    latest_only: 'true',
    next_dose_to: isoDateInDays(DUE_SOON_DAYS),
    page: String(page),
    per_page: String(PANEL_SIZE),
  });
  const { data, error, loading, retry } = useApiQuery<VaccineListResponse>(`/vaccines?${params}`);

  return (
    <Panel
      id="inicio-vacinas"
      title="Vacinas para acompanhar"
      hint={`Doses atrasadas ou que vencem nos próximos ${DUE_SOON_DAYS} dias`}
      loading={loading}
    >
      {error ? (
        <PanelError message="Não foi possível carregar as vacinas" onRetry={retry} />
      ) : !data ? (
        <ListSkeleton label="Carregando vacinas" />
      ) : data.data.length === 0 ? (
        <PanelEmpty icon={<CircleCheck size={20} strokeWidth={1.75} />}>
          Nenhuma dose atrasada ou vencendo nos próximos {DUE_SOON_DAYS} dias.
        </PanelEmpty>
      ) : (
        <>
          <ul className={list.list} data-refreshing={loading || undefined}>
            {data.data.map((vaccine) => (
              <DueVaccineRow key={vaccine.id} vaccine={vaccine} />
            ))}
          </ul>
          <Pagination
            pagination={data.pagination}
            shown={data.data.length}
            unit={['dose', 'doses']}
            onChange={setPage}
          />
        </>
      )}
    </Panel>
  );
}

function DueVaccineRow({ vaccine }: { vaccine: VaccineListItemDto }) {
  const dose = withCurrentDoseStatus(vaccine);
  const { patient } = vaccine;
  const phone = formatPhone(patient.tutor.phone);

  return (
    <li>
      <Link
        to={`/pacientes/${patient.id}?aba=vacinas`}
        className={`${list.row} ${styles.row} ${styles.vaccineRow}`}
      >
        <Avatar name={patient.name} kind="patient" photoUrl={patient.photo_url} />
        <span className={list.stack}>
          <span className={list.name}>{patient.name}</span>
          <span className={styles.detail}>
            {vaccine.name}
            {vaccine.next_dose_date && (
              <>
                {' · '}
                <span className="visually-hidden">próxima dose em </span>
                <span className={list.data}>{formatDate(vaccine.next_dose_date)}</span>
              </>
            )}
          </span>
          <span className={list.meta}>
            <span className="visually-hidden">Tutor: </span>
            {patient.tutor.name}
            {phone && (
              <>
                {' · '}
                <span className={list.data}>{phone}</span>
              </>
            )}
          </span>
        </span>
        <span className={styles.status}>
          <Badge tone={VACCINE_STATUS_TONES[dose.status]}>{describeVaccineStatus(dose)}</Badge>
        </span>
      </Link>
    </li>
  );
}

/** Os atendimentos registrados por último, de qualquer paciente. */
function RecentAppointments() {
  const { data, error, loading, retry } = useApiQuery<AppointmentListResponse>(
    `/appointments?per_page=${PANEL_SIZE}`,
  );
  // Nome dos locais cadastrados; sem ele a linha mostra "Local cadastrado".
  const locations = useApiQuery<LocationListResponse>('/locations?per_page=100').data;
  const locationNames = new Map(
    (locations?.data ?? []).map((location) => [location.id, location.name]),
  );

  return (
    <Panel
      id="inicio-atendimentos"
      title="Últimos atendimentos"
      hint="Os registrados por último, de todos os pacientes"
      loading={loading}
    >
      {error ? (
        <PanelError message="Não foi possível carregar os atendimentos" onRetry={retry} />
      ) : !data ? (
        <ListSkeleton label="Carregando atendimentos" />
      ) : data.data.length === 0 ? (
        <PanelEmpty icon={<ClipboardList size={20} strokeWidth={1.75} />}>
          Nenhum atendimento registrado ainda. Para registrar, abra o prontuário do paciente.
        </PanelEmpty>
      ) : (
        <ul className={list.list}>
          {data.data.map((appointment) => (
            <AppointmentRow
              key={appointment.id}
              appointment={appointment}
              location={describeLocation(appointment, locationNames)}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}

interface AppointmentRowProps {
  appointment: AppointmentListItemDto;
  location: string;
}

function AppointmentRow({ appointment, location }: AppointmentRowProps) {
  const { patient } = appointment;

  return (
    <li>
      <Link
        to={`/pacientes/${patient.id}?aba=historico&atendimento=${appointment.id}`}
        className={`${list.row} ${styles.row} ${styles.appointmentRow}`}
      >
        <Avatar name={patient.name} kind="patient" photoUrl={patient.photo_url} />
        <span className={list.stack}>
          <span className={list.name}>{patient.name}</span>
          <span className={styles.detail}>{appointmentTitle(appointment)}</span>
          <span className={list.meta}>{location}</span>
        </span>
        <span className={styles.when}>
          <span className={list.data}>{formatDate(appointment.date)}</span>
          <span className={styles.ago}>{formatDaysAgo(appointment.date)}</span>
        </span>
      </Link>
    </li>
  );
}

interface PanelProps {
  id: string;
  title: string;
  hint?: string;
  loading: boolean;
  children: ReactNode;
}

function Panel({ id, title, hint, loading, children }: PanelProps) {
  return (
    <section className={styles.panel} aria-labelledby={id} aria-busy={loading}>
      <div className={styles.panelHeading}>
        <h2 id={id} className={styles.panelTitle}>
          {title}
        </h2>
        {hint && <p className={styles.panelHint}>{hint}</p>}
      </div>
      <div className={list.card}>{children}</div>
    </section>
  );
}

// Painel vazio não é tela vazia: só informa, a ação primária já está no cabeçalho.
function PanelEmpty({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className={styles.panelEmpty}>
      <span className={styles.panelEmptyIcon} aria-hidden="true">
        {icon}
      </span>
      <span>{children}</span>
    </p>
  );
}

function PanelError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={list.errorBox}>
      <Alert tone="error" title={message}>
        Verifique sua conexão e tente de novo.
      </Alert>
      <Button
        variant="secondary"
        icon={<RotateCw size={18} strokeWidth={1.75} aria-hidden="true" />}
        onClick={onRetry}
      >
        Tentar de novo
      </Button>
    </div>
  );
}

// Conta nova (ou sem pacientes): o convite e o que vem depois dele.
const FIRST_STEPS = [
  { label: 'Criar sua conta', done: true },
  { label: 'Cadastrar o primeiro paciente', done: false },
  { label: 'Registrar um atendimento ou uma vacina', done: false },
];

function FirstSteps() {
  return (
    <section className={styles.firstSteps} aria-labelledby="inicio-comecar">
      <span className={styles.firstStepsIcon} aria-hidden="true">
        <PawPrint size={24} strokeWidth={1.75} />
      </span>
      <h2 id="inicio-comecar" className={styles.firstStepsTitle}>
        Sua conta está pronta
      </h2>
      <p className={styles.firstStepsText}>
        Cadastre o primeiro paciente para começar o histórico. Só nome e tutor são obrigatórios —
        peso, vacinas e o resto você registra a cada atendimento.
      </p>
      <ButtonLink to="/pacientes/novo" icon={<Plus size={18} strokeWidth={2} aria-hidden="true" />}>
        Cadastrar primeiro paciente
      </ButtonLink>

      <div className={styles.steps}>
        <h3 className={styles.stepsTitle}>Primeiros passos</h3>
        <ol className={styles.stepList}>
          {FIRST_STEPS.map((step) => (
            <li key={step.label} className={styles.step} data-done={step.done || undefined}>
              {step.done ? (
                <CircleCheck size={20} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Circle size={20} strokeWidth={1.75} aria-hidden="true" />
              )}
              <span>
                {step.label}
                {step.done && <span className="visually-hidden"> (concluído)</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
