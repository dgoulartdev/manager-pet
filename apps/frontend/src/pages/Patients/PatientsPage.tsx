import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, PawPrint, Plus, RotateCw, SearchX } from 'lucide-react';
import type { PatientListItemDto, PatientListResponse } from '@meupaciente/shared';
import { useAuth } from '../../auth/AuthContext';
import {
  describePatient,
  firstNameOf,
  formatAge,
  formatPhone,
  greetingFor,
  pluralize,
  toSearchTerm,
} from '../../lib/format';
import { useApiQuery } from '../../lib/useApiQuery';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useListSearch } from '../../lib/useListSearch';
import { Alert } from '../../components/Alert/Alert';
import { Avatar } from '../../components/Avatar/Avatar';
import { Button, ButtonLink } from '../../components/Button/Button';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { ListSkeleton } from '../../components/ListPage/ListSkeleton';
import { Pagination } from '../../components/ListPage/Pagination';
import { SearchField } from '../../components/SearchField/SearchField';
import list from '../../components/ListPage/ListPage.module.css';
import styles from './PatientsPage.module.css';

const PER_PAGE = 20;

export function PatientsPage() {
  useDocumentTitle('Pacientes');
  const { state } = useAuth();
  const userName = state.status === 'authenticated' ? state.user.name : '';

  // Busca e página vivem na URL: voltar do prontuário devolve a mesma lista.
  const { query, page, searchText, setSearchText, searchRef, goToPage } = useListSearch();

  const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
  if (query) params.set('q', toSearchTerm(query));
  const { data, error, loading, retry } = useApiQuery<PatientListResponse>(`/patients?${params}`);

  // Total cadastrado (sem busca) para o cabeçalho; durante a busca mantém o último conhecido.
  const [registeredTotal, setRegisteredTotal] = useState<number | null>(null);
  useEffect(() => {
    if (data && !query) setRegisteredTotal(data.pagination.total);
  }, [data, query]);

  const hasNoPatients = !query && data?.pagination.total === 0;
  const greeting = `${greetingFor()}, ${firstNameOf(userName)}`;

  return (
    <div className={list.page}>
      <header className={list.header}>
        <div className={list.heading}>
          <h1 className={list.title}>Pacientes</h1>
          <p className={list.subtitle}>
            {greeting}
            {registeredTotal !== null && registeredTotal > 0 && (
              <> · {pluralize(registeredTotal, 'paciente cadastrado', 'pacientes cadastrados')}</>
            )}
          </p>
        </div>
        {/* No estado vazio a ação fica no centro: uma ação primária por tela (DS). */}
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

      {!hasNoPatients && (
        <SearchField
          ref={searchRef}
          className={list.search}
          label="Buscar pacientes"
          placeholder="Paciente, tutor ou telefone"
          shortcut="/"
          value={searchText}
          onChange={setSearchText}
        />
      )}

      <section
        className={`${list.card} ${styles.patients}`}
        aria-labelledby="lista-pacientes"
        aria-busy={loading}
      >
        <h2 id="lista-pacientes" className="visually-hidden">
          {query ? `Resultados para ${query}` : 'Lista de pacientes'}
        </h2>

        {error ? (
          <div className={list.errorBox}>
            <Alert tone="error" title="Não foi possível carregar os pacientes">
              Verifique sua conexão e tente de novo.
            </Alert>
            <Button
              variant="secondary"
              icon={<RotateCw size={18} strokeWidth={1.75} aria-hidden="true" />}
              onClick={retry}
            >
              Tentar de novo
            </Button>
          </div>
        ) : !data ? (
          <ListSkeleton label="Carregando pacientes" />
        ) : hasNoPatients ? (
          <EmptyState
            icon={<PawPrint size={24} strokeWidth={1.75} />}
            title="Cadastre o primeiro paciente"
            description="Só nome e tutor são obrigatórios. Peso, vacinas e histórico você registra a cada atendimento."
            action={
              <ButtonLink
                to="/pacientes/novo"
                icon={<Plus size={18} strokeWidth={2} aria-hidden="true" />}
              >
                Cadastrar paciente
              </ButtonLink>
            }
          />
        ) : data.data.length === 0 ? (
          <EmptyState
            icon={<SearchX size={24} strokeWidth={1.75} />}
            title={`Nenhum paciente encontrado para “${query}”`}
            description="Confira a grafia ou busque pelo nome ou telefone do tutor."
            action={
              <Button variant="secondary" onClick={() => setSearchText('')}>
                Limpar busca
              </Button>
            }
          />
        ) : (
          <>
            <div className={list.columns} aria-hidden="true">
              <span>Paciente</span>
              <span>Tutor</span>
              <span>Idade</span>
            </div>
            <ul className={list.list} data-refreshing={loading || undefined}>
              {data.data.map((patient) => (
                <PatientRow key={patient.id} patient={patient} />
              ))}
            </ul>
            <Pagination
              pagination={data.pagination}
              shown={data.data.length}
              unit={['paciente', 'pacientes']}
              onChange={goToPage}
            />
          </>
        )}
      </section>

      {/* Mobile: a ação principal vira botão flutuante acima das abas. */}
      {!hasNoPatients && (
        <Link to="/pacientes/novo" className={list.fab} aria-label="Novo paciente">
          <Plus size={24} strokeWidth={2} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function PatientRow({ patient }: { patient: PatientListItemDto }) {
  const details = describePatient(patient);
  const age = formatAge(patient.birth_date);
  const phone = formatPhone(patient.tutor.phone);

  return (
    <li>
      <Link to={`/pacientes/${patient.id}`} className={`${list.row} ${styles.row}`}>
        <span className={styles.patientCell}>
          <Avatar name={patient.name} kind="patient" photoUrl={patient.photo_url} />
          <span className={list.stack}>
            <span className={list.name}>{patient.name}</span>
            {details && <span className={list.meta}>{details}</span>}
          </span>
        </span>
        <span className={styles.tutorCell}>
          <span className="visually-hidden">Tutor: </span>
          <span className={styles.tutorName}>{patient.tutor.name}</span>
          {phone && <span className={`${list.data} ${styles.phone}`}>{phone}</span>}
        </span>
        <span className={styles.ageCell}>
          {age ? (
            <>
              <span className="visually-hidden">Idade: </span>
              {age}
            </>
          ) : (
            <span className={list.missing}>
              <span className="visually-hidden">Idade não informada</span>
              <span aria-hidden="true">—</span>
            </span>
          )}
        </span>
        <ChevronRight
          className={`${list.trailingIcon} ${styles.chevron}`}
          size={18}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}
