import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, PawPrint, Plus, RotateCw, SearchX } from 'lucide-react';
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
import { Alert } from '../../components/Alert/Alert';
import { Avatar } from '../../components/Avatar/Avatar';
import { Button, ButtonLink } from '../../components/Button/Button';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { SearchField } from '../../components/SearchField/SearchField';
import styles from './PatientsPage.module.css';

const PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 300;


export function PatientsPage() {
  useDocumentTitle('Pacientes');
  const { state } = useAuth();
  const userName = state.status === 'authenticated' ? state.user.name : '';

  // Busca e página vivem na URL: voltar do prontuário devolve a mesma lista.
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const page = Math.max(1, Number(searchParams.get('pagina')) || 1);

  const [searchText, setSearchText] = useState(query);
  const searchRef = useRef<HTMLInputElement>(null);

  // Voltar/avançar no navegador muda a URL: a caixa de busca acompanha.
  useEffect(() => {
    setSearchText((current) => (current.trim() === query ? current : query));
  }, [query]);

  // Digitação atualiza a URL (e a busca) só depois de uma pausa.
  useEffect(() => {
    const term = searchText.trim();
    if (term === query) return;
    const timer = window.setTimeout(() => {
      setSearchParams(term ? { q: term } : {}, { replace: true });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchText, query, setSearchParams]);

  // Atalho do DS: "/" leva à busca de qualquer ponto da tela.
  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      const target = event.target instanceof Element ? event.target : null;
      const typing = target?.closest('input, textarea, select, [contenteditable="true"]');
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
  if (query) params.set('q', toSearchTerm(query));
  const { data, error, loading, retry } = useApiQuery<PatientListResponse>(`/patients?${params}`);

  // Total cadastrado (sem busca) para o cabeçalho; durante a busca mantém o último conhecido.
  const [registeredTotal, setRegisteredTotal] = useState<number | null>(null);
  useEffect(() => {
    if (data && !query) setRegisteredTotal(data.pagination.total);
  }, [data, query]);

  function goToPage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    if (nextPage > 1) next.set('pagina', String(nextPage));
    else next.delete('pagina');
    setSearchParams(next);
    window.scrollTo({ top: 0 });
  }

  const hasNoPatients = !query && data?.pagination.total === 0;
  const greeting = `${greetingFor()}, ${firstNameOf(userName)}`;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.title}>Pacientes</h1>
          <p className={styles.subtitle}>
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
            className={styles.newButton}
            icon={<Plus size={18} strokeWidth={2} aria-hidden="true" />}
          >
            Novo paciente
          </ButtonLink>
        )}
      </header>

      {!hasNoPatients && (
        <SearchField
          ref={searchRef}
          className={styles.search}
          label="Buscar pacientes"
          placeholder="Paciente, tutor ou telefone"
          shortcut="/"
          value={searchText}
          onChange={setSearchText}
        />
      )}

      <section className={styles.card} aria-labelledby="lista-pacientes" aria-busy={loading}>
        <h2 id="lista-pacientes" className="visually-hidden">
          {query ? `Resultados para ${query}` : 'Lista de pacientes'}
        </h2>

        {error ? (
          <div className={styles.errorBox}>
            <Alert tone="error" title="Não foi possível carregar os pacientes">
              Verifique sua conexão e tente de novo.
            </Alert>
            <Button variant="secondary" icon={<RotateCw size={18} strokeWidth={1.75} aria-hidden="true" />} onClick={retry}>
              Tentar de novo
            </Button>
          </div>
        ) : !data ? (
          <ListSkeleton />
        ) : hasNoPatients ? (
          <EmptyState
            icon={<PawPrint size={24} strokeWidth={1.75} />}
            title="Cadastre o primeiro paciente"
            description="Só nome e tutor são obrigatórios. Peso, vacinas e histórico você registra a cada atendimento."
            action={
              <ButtonLink to="/pacientes/novo" icon={<Plus size={18} strokeWidth={2} aria-hidden="true" />}>
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
            <div className={styles.columns} aria-hidden="true">
              <span>Paciente</span>
              <span>Tutor</span>
              <span>Idade</span>
            </div>
            <ul className={styles.list} data-refreshing={loading || undefined}>
              {data.data.map((patient) => (
                <PatientRow key={patient.id} patient={patient} />
              ))}
            </ul>
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.total_pages}
              total={data.pagination.total}
              shown={data.data.length}
              perPage={data.pagination.per_page}
              onChange={goToPage}
            />
          </>
        )}
      </section>

      {/* Mobile: a ação principal vira botão flutuante acima das abas. */}
      {!hasNoPatients && (
        <Link to="/pacientes/novo" className={styles.fab} aria-label="Novo paciente">
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
      <Link to={`/pacientes/${patient.id}`} className={styles.row}>
        <span className={styles.patientCell}>
          <Avatar
            name={patient.name}
            kind="patient"
            photoUrl={patient.photo_url}
          />
          <span className={styles.stack}>
            <span className={styles.patientName}>{patient.name}</span>
            {details && <span className={styles.meta}>{details}</span>}
          </span>
        </span>
        <span className={styles.tutorCell}>
          <span className="visually-hidden">Tutor: </span>
          <span className={styles.tutorName}>{patient.tutor.name}</span>
          {phone && <span className={styles.phone}>{phone}</span>}
        </span>
        <span className={styles.ageCell}>
          {age ? (
            <>
              <span className="visually-hidden">Idade: </span>
              {age}
            </>
          ) : (
            <span className={styles.missing}>
              <span className="visually-hidden">Idade não informada</span>
              <span aria-hidden="true">—</span>
            </span>
          )}
        </span>
        <ChevronRight className={styles.chevron} size={18} strokeWidth={1.75} aria-hidden="true" />
      </Link>
    </li>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  shown: number;
  perPage: number;
  onChange: (page: number) => void;
}

function Pagination({ page, totalPages, total, shown, perPage, onChange }: PaginationProps) {
  const first = (page - 1) * perPage + 1;
  const last = first + shown - 1;

  return (
    <nav className={styles.pagination} aria-label="Paginação">
      <p className={styles.range}>
        {totalPages > 1 ? (
          <>
            <span className={styles.number}>
              {first}–{last}
            </span>{' '}
            de <span className={styles.number}>{total.toLocaleString('pt-BR')}</span>
          </>
        ) : (
          pluralize(total, 'paciente', 'pacientes')
        )}
      </p>
      {totalPages > 1 && (
        <div className={styles.pageButtons}>
          <Button
            variant="secondary"
            size="sm"
            aria-label="Página anterior"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
          >
            <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
          </Button>
          <span className={styles.pageInfo}>
            Página {page} de {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            aria-label="Próxima página"
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
          >
            <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        </div>
      )}
    </nav>
  );
}

// DS: esqueleto de 5 linhas no carregamento.
function ListSkeleton() {
  return (
    <div className={styles.skeleton} role="status">
      <span className="visually-hidden">Carregando pacientes</span>
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className={styles.skeletonRow} aria-hidden="true">
          <span className={styles.skeletonAvatar} />
          <span className={styles.skeletonLines}>
            <span />
            <span />
          </span>
        </div>
      ))}
    </div>
  );
}
