import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PawPrint, Pencil, Plus, RotateCw, SearchX, Trash2, UsersRound } from 'lucide-react';
import type { TutorDto, TutorListItemDto, TutorListResponse } from '@meupaciente/shared';
import { apiRequest } from '../../lib/api';
import { formatPhone, pluralize, toSearchTerm } from '../../lib/format';
import { useApiQuery } from '../../lib/useApiQuery';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useListSearch } from '../../lib/useListSearch';
import { Alert } from '../../components/Alert/Alert';
import { Avatar } from '../../components/Avatar/Avatar';
import { Button } from '../../components/Button/Button';
import { DeleteDialog } from '../../components/DeleteDialog/DeleteDialog';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { ListSkeleton } from '../../components/ListPage/ListSkeleton';
import { Pagination } from '../../components/ListPage/Pagination';
import { SearchField } from '../../components/SearchField/SearchField';
import { useToast } from '../../components/Toast/Toast';
import { TutorDialog } from '../../components/TutorDialog/TutorDialog';
import list from '../../components/ListPage/ListPage.module.css';
import styles from './TutorsPage.module.css';

const PER_PAGE = 20;

// Nenhum tutor aberto · cadastro de um novo · edição de um da lista.
type Editing = null | 'new' | TutorListItemDto;

/**
 * "Miso", "Miso e Nina", "Miso, Nina, Tom e mais 2". Em frase, `inSentence`
 * completa a contagem: "…e mais 2 pacientes".
 */
function patientNames(tutor: TutorListItemDto, inSentence = false): string {
  const names = tutor.patients.map((patient) => patient.name);
  const remaining = tutor.patients_count - names.length;
  if (remaining > 0) {
    const more = inSentence ? pluralize(remaining, 'paciente', 'pacientes') : String(remaining);
    return `${names.join(', ')} e mais ${more}`;
  }
  return new Intl.ListFormat('pt-BR', { type: 'conjunction' }).format(names);
}

export function TutorsPage() {
  useDocumentTitle('Tutores');
  const showToast = useToast();
  const { query, page, searchText, setSearchText, searchRef, goToPage, showAll } = useListSearch();

  const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
  if (query) params.set('q', toSearchTerm(query));
  const { data, error, loading, retry } = useApiQuery<TutorListResponse>(`/tutors?${params}`);

  // Total cadastrado (sem busca) para o cabeçalho; durante a busca mantém o último conhecido.
  const [registeredTotal, setRegisteredTotal] = useState<number | null>(null);
  useEffect(() => {
    if (data && !query) setRegisteredTotal(data.pagination.total);
  }, [data, query]);

  const [editing, setEditing] = useState<Editing>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const editingTutor = editing !== null && editing !== 'new' ? editing : null;

  const hasNoTutors = !query && data?.pagination.total === 0;
  const hasNoResults = Boolean(query) && data?.data.length === 0;

  function handleSaved(tutor: TutorDto) {
    const created = editing === 'new';
    setEditing(null);
    showToast({
      tone: 'success',
      title: created ? 'Tutor cadastrado' : 'Alterações salvas',
      description: tutor.name,
    });
    // O novo tutor aparece no topo da lista, sem busca.
    if (created) showAll();
    retry();
  }

  async function deleteTutor(tutor: TutorListItemDto) {
    await apiRequest(`/tutors/${tutor.id}`, { method: 'DELETE' });
    setConfirmingDelete(false);
    setEditing(null);
    showToast({ tone: 'success', title: 'Tutor excluído', description: tutor.name });
    // Era o último da página: volta uma página em vez de mostrar uma página vazia.
    if (data?.data.length === 1 && page > 1) goToPage(page - 1);
    else retry();
  }

  return (
    <div className={list.page}>
      <header className={list.header}>
        <div className={list.heading}>
          <h1 className={list.title}>Tutores</h1>
          {registeredTotal !== null && registeredTotal > 0 && (
            <p className={list.subtitle}>
              {pluralize(registeredTotal, 'tutor cadastrado', 'tutores cadastrados')}
            </p>
          )}
        </div>
        {/* No estado vazio a ação fica no centro: uma ação primária por tela (DS). */}
        {!hasNoTutors && (
          <Button
            className={list.headerAction}
            icon={<Plus size={18} strokeWidth={2} aria-hidden="true" />}
            onClick={() => setEditing('new')}
          >
            Novo tutor
          </Button>
        )}
      </header>

      {!hasNoTutors && (
        <SearchField
          ref={searchRef}
          className={list.search}
          label="Buscar tutores"
          placeholder="Tutor, paciente, telefone ou e-mail"
          shortcut="/"
          value={searchText}
          onChange={setSearchText}
        />
      )}

      <section
        className={`${list.card} ${styles.tutors}`}
        aria-labelledby="lista-tutores"
        aria-busy={loading}
      >
        <h2 id="lista-tutores" className="visually-hidden">
          {query ? `Resultados para ${query}` : 'Lista de tutores'}
        </h2>

        {error ? (
          <div className={list.errorBox}>
            <Alert tone="error" title="Não foi possível carregar os tutores">
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
          <ListSkeleton label="Carregando tutores" />
        ) : hasNoTutors ? (
          <EmptyState
            icon={<UsersRound size={24} strokeWidth={1.75} />}
            title="Cadastre o primeiro tutor"
            description="Você também pode cadastrar o tutor junto com o paciente, sem sair do formulário."
            action={
              <Button
                icon={<Plus size={18} strokeWidth={2} aria-hidden="true" />}
                onClick={() => setEditing('new')}
              >
                Cadastrar tutor
              </Button>
            }
          />
        ) : hasNoResults ? (
          <EmptyState
            icon={<SearchX size={24} strokeWidth={1.75} />}
            title={`Nenhum tutor encontrado para “${query}”`}
            description="Busque pelo nome, telefone ou e-mail do tutor, ou pelo nome de um paciente."
            action={
              <Button variant="secondary" onClick={() => setSearchText('')}>
                Limpar busca
              </Button>
            }
          />
        ) : (
          <>
            <div className={list.columns} aria-hidden="true">
              <span>Tutor</span>
              <span>Telefone</span>
              <span>Pacientes</span>
            </div>
            <ul className={list.list} data-refreshing={loading || undefined}>
              {data.data.map((tutor) => (
                <TutorRow key={tutor.id} tutor={tutor} onOpen={() => setEditing(tutor)} />
              ))}
            </ul>
            <Pagination
              pagination={data.pagination}
              shown={data.data.length}
              unit={['tutor', 'tutores']}
              onChange={goToPage}
            />
          </>
        )}
      </section>

      {/* Mobile: a ação principal vira botão flutuante acima das abas. */}
      {!hasNoTutors && (
        <button
          type="button"
          className={list.fab}
          aria-label="Novo tutor"
          onClick={() => setEditing('new')}
        >
          <Plus size={24} strokeWidth={2} aria-hidden="true" />
        </button>
      )}

      <TutorDialog
        open={editing !== null}
        tutor={editingTutor}
        // Busca sem resultado: o que foi digitado já começa preenchido.
        initialText={hasNoResults ? query : ''}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
        extraAction={
          editingTutor && (
            <Button
              variant="ghost"
              className={styles.deleteButton}
              icon={<Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />}
              onClick={() => setConfirmingDelete(true)}
            >
              Excluir tutor
            </Button>
          )
        }
      >
        {editingTutor && <LinkedPatients tutor={editingTutor} />}
      </TutorDialog>

      {editingTutor && (
        <DeleteDialog
          open={confirmingDelete}
          name={editingTutor.name}
          consequence="O cadastro deste tutor, com telefone e e-mail, será apagado."
          confirmLabel="Excluir tutor"
          blocked={editingTutor.patients_count > 0}
          blockedReason={
            editingTutor.patients_count > 0
              ? {
                  title: pluralize(
                    editingTutor.patients_count,
                    'paciente vinculado',
                    'pacientes vinculados',
                  ),
                  description: `${patientNames(editingTutor, true)} ${
                    editingTutor.patients_count === 1 ? 'está vinculado' : 'estão vinculados'
                  } a este tutor. Um tutor só pode ser excluído quando não tem pacientes.`,
                }
              : {
                  title: 'Há pacientes vinculados',
                  description:
                    'Um paciente foi vinculado a este tutor. Um tutor só pode ser excluído quando não tem pacientes.',
                }
          }
          onConfirm={() => deleteTutor(editingTutor)}
          onConflict={retry}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}

function TutorRow({ tutor, onOpen }: { tutor: TutorListItemDto; onOpen: () => void }) {
  const phone = formatPhone(tutor.phone);

  return (
    <li>
      <button
        type="button"
        className={`${list.row} ${styles.row}`}
        aria-haspopup="dialog"
        onClick={onOpen}
      >
        <span className={styles.tutorCell}>
          <Avatar name={tutor.name} kind="person" />
          <span className={list.stack}>
            <span className={list.name}>
              <span className="visually-hidden">Editar </span>
              {tutor.name}
            </span>
            {tutor.email && <span className={list.meta}>{tutor.email}</span>}
          </span>
        </span>
        <span className={styles.phoneCell} data-missing={phone ? undefined : true}>
          {phone ? (
            <>
              <span className="visually-hidden">Telefone: </span>
              <span className={list.data}>{phone}</span>
            </>
          ) : (
            <span className={list.missing}>
              <span className="visually-hidden">Telefone não informado</span>
              <span aria-hidden="true">—</span>
            </span>
          )}
        </span>
        <span className={styles.patientsCell}>
          <PawPrint className={styles.pawIcon} size={16} strokeWidth={1.75} aria-hidden="true" />
          {tutor.patients_count > 0 ? (
            <span className={styles.patientNames}>
              <span className="visually-hidden">Pacientes: </span>
              {patientNames(tutor)}
            </span>
          ) : (
            <span className={`${styles.patientNames} ${list.missing}`}>Nenhum paciente</span>
          )}
        </span>
        <Pencil
          className={`${list.trailingIcon} ${styles.editIcon}`}
          size={18}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </button>
    </li>
  );
}

// Na edição: de quem este tutor é, com atalho para cada prontuário.
function LinkedPatients({ tutor }: { tutor: TutorListItemDto }) {
  const remaining = tutor.patients_count - tutor.patients.length;

  return (
    <section className={styles.linked} aria-labelledby="pacientes-vinculados">
      <h3 id="pacientes-vinculados" className={styles.linkedTitle}>
        Pacientes vinculados
      </h3>
      {tutor.patients_count === 0 ? (
        <p className={styles.linkedEmpty}>Nenhum paciente cadastrado com este tutor.</p>
      ) : (
        <ul className={styles.linkedList}>
          {tutor.patients.map((patient) => (
            <li key={patient.id}>
              <Link to={`/pacientes/${patient.id}`} className={styles.patientLink}>
                <PawPrint size={16} strokeWidth={1.75} aria-hidden="true" />
                {patient.name}
              </Link>
            </li>
          ))}
          {remaining > 0 && (
            <li>
              <Link
                to={`/pacientes?q=${encodeURIComponent(tutor.name)}`}
                className={styles.patientLink}
              >
                Ver todos os {tutor.patients_count}
              </Link>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
