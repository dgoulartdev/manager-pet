import { useEffect, useState } from 'react';
import { MapPin, Pencil, Plus, RotateCw, SearchX, Trash2 } from 'lucide-react';
import type { LocationDto, LocationListItemDto, LocationListResponse } from '@meupaciente/shared';
import { apiRequest } from '../../lib/api';
import { formatPhone, pluralize, toSearchTerm } from '../../lib/format';
import { useApiQuery } from '../../lib/useApiQuery';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useListSearch } from '../../lib/useListSearch';
import { Alert } from '../../components/Alert/Alert';
import { Button } from '../../components/Button/Button';
import { DeleteDialog } from '../../components/DeleteDialog/DeleteDialog';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { ListSkeleton } from '../../components/ListPage/ListSkeleton';
import { Pagination } from '../../components/ListPage/Pagination';
import { LocationDialog } from '../../components/LocationDialog/LocationDialog';
import { SearchField } from '../../components/SearchField/SearchField';
import { useToast } from '../../components/Toast/Toast';
import list from '../../components/ListPage/ListPage.module.css';
import styles from './LocationsPage.module.css';

const PER_PAGE = 20;

// Nenhum local aberto · cadastro de um novo · edição de um da lista.
type Editing = null | 'new' | LocationListItemDto;

export function LocationsPage() {
  useDocumentTitle('Locais');
  const showToast = useToast();
  const { query, page, searchText, setSearchText, searchRef, goToPage, showAll } = useListSearch();

  const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
  if (query) params.set('q', toSearchTerm(query));
  const { data, error, loading, retry } = useApiQuery<LocationListResponse>(`/locations?${params}`);

  // Total cadastrado (sem busca) para o cabeçalho; durante a busca mantém o último conhecido.
  const [registeredTotal, setRegisteredTotal] = useState<number | null>(null);
  useEffect(() => {
    if (data && !query) setRegisteredTotal(data.pagination.total);
  }, [data, query]);

  const [editing, setEditing] = useState<Editing>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const editingLocation = editing !== null && editing !== 'new' ? editing : null;

  const hasNoLocations = !query && data?.pagination.total === 0;
  const hasNoResults = Boolean(query) && data?.data.length === 0;

  function handleSaved(location: LocationDto) {
    const created = editing === 'new';
    setEditing(null);
    showToast({
      tone: 'success',
      title: created ? 'Local cadastrado' : 'Alterações salvas',
      description: location.name,
    });
    // O novo local aparece no topo da lista, sem busca.
    if (created) showAll();
    retry();
  }

  async function deleteLocation(location: LocationListItemDto) {
    await apiRequest(`/locations/${location.id}`, { method: 'DELETE' });
    setConfirmingDelete(false);
    setEditing(null);
    showToast({ tone: 'success', title: 'Local excluído', description: location.name });
    // Era o último da página: volta uma página em vez de mostrar uma página vazia.
    if (data?.data.length === 1 && page > 1) goToPage(page - 1);
    else retry();
  }

  return (
    <div className={list.page}>
      <header className={list.header}>
        <div className={list.heading}>
          <h1 className={list.title}>Locais</h1>
          {registeredTotal !== null && registeredTotal > 0 && (
            <p className={list.subtitle}>
              {pluralize(registeredTotal, 'local cadastrado', 'locais cadastrados')}
            </p>
          )}
        </div>
        {/* No estado vazio a ação fica no centro: uma ação primária por tela (DS). */}
        {!hasNoLocations && (
          <Button
            className={list.headerAction}
            icon={<Plus size={18} strokeWidth={2} aria-hidden="true" />}
            onClick={() => setEditing('new')}
          >
            Novo local
          </Button>
        )}
      </header>

      {!hasNoLocations && (
        <SearchField
          ref={searchRef}
          className={list.search}
          label="Buscar locais"
          placeholder="Nome, endereço ou telefone"
          shortcut="/"
          value={searchText}
          onChange={setSearchText}
        />
      )}

      <section
        className={`${list.card} ${styles.locations}`}
        aria-labelledby="lista-locais"
        aria-busy={loading}
      >
        <h2 id="lista-locais" className="visually-hidden">
          {query ? `Resultados para ${query}` : 'Lista de locais'}
        </h2>

        {error ? (
          <div className={list.errorBox}>
            <Alert tone="error" title="Não foi possível carregar os locais">
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
          <ListSkeleton label="Carregando locais" />
        ) : hasNoLocations ? (
          <EmptyState
            icon={<MapPin size={24} strokeWidth={1.75} />}
            title="Cadastre o primeiro local"
            description="Clínicas parceiras e consultórios onde você atende com frequência. Para domicílio ou um local eventual, não é preciso cadastrar."
            action={
              <Button
                icon={<Plus size={18} strokeWidth={2} aria-hidden="true" />}
                onClick={() => setEditing('new')}
              >
                Cadastrar local
              </Button>
            }
          />
        ) : hasNoResults ? (
          <EmptyState
            icon={<SearchX size={24} strokeWidth={1.75} />}
            title={`Nenhum local encontrado para “${query}”`}
            description="Busque pelo nome, endereço ou telefone do local."
            action={
              <Button variant="secondary" onClick={() => setSearchText('')}>
                Limpar busca
              </Button>
            }
          />
        ) : (
          <>
            <div className={list.columns} aria-hidden="true">
              <span>Local</span>
              <span>Telefone</span>
              <span className={styles.countHeader}>Atendimentos</span>
            </div>
            <ul className={list.list} data-refreshing={loading || undefined}>
              {data.data.map((location) => (
                <LocationRow
                  key={location.id}
                  location={location}
                  onOpen={() => setEditing(location)}
                />
              ))}
            </ul>
            <Pagination
              pagination={data.pagination}
              shown={data.data.length}
              unit={['local', 'locais']}
              onChange={goToPage}
            />
          </>
        )}
      </section>

      {/* Mobile: a ação principal vira botão flutuante acima das abas. */}
      {!hasNoLocations && (
        <button
          type="button"
          className={list.fab}
          aria-label="Novo local"
          onClick={() => setEditing('new')}
        >
          <Plus size={24} strokeWidth={2} aria-hidden="true" />
        </button>
      )}

      <LocationDialog
        open={editing !== null}
        location={editingLocation}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
        extraAction={
          editingLocation && (
            <Button
              variant="ghost"
              className={styles.deleteButton}
              icon={<Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />}
              onClick={() => setConfirmingDelete(true)}
            >
              Excluir local
            </Button>
          )
        }
      />

      {editingLocation && (
        <DeleteDialog
          open={confirmingDelete}
          name={editingLocation.name}
          consequence="O local sai da sua lista."
          confirmLabel="Excluir local"
          blocked={editingLocation.appointments_count > 0}
          blockedReason={{
            title:
              editingLocation.appointments_count > 0
                ? `Local usado em ${pluralize(editingLocation.appointments_count, 'atendimento', 'atendimentos')}`
                : 'Local usado em atendimentos',
            description:
              'Para preservar o histórico dos pacientes, um local com atendimentos não pode ser excluído. Se o nome ou o endereço mudou, basta editar os dados do local.',
          }}
          onConfirm={() => deleteLocation(editingLocation)}
          onConflict={retry}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}

function LocationRow({ location, onOpen }: { location: LocationListItemDto; onOpen: () => void }) {
  const phone = formatPhone(location.phone);

  return (
    <li>
      <button
        type="button"
        className={`${list.row} ${styles.row}`}
        aria-haspopup="dialog"
        onClick={onOpen}
      >
        <span className={styles.locationCell}>
          <span className={list.stack}>
            <span className={list.name}>
              <span className="visually-hidden">Editar </span>
              {location.name}
            </span>
            {location.address && <span className={list.meta}>{location.address}</span>}
          </span>
        </span>
        {/* Telefone e atendimentos: colunas da tabela, uma linha só no card. */}
        <span className={styles.details}>
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
          <span className={styles.countCell}>
            <span className={list.data}>{location.appointments_count.toLocaleString('pt-BR')}</span>
            {/* Na tabela o cabeçalho dá o nome; no card, o texto completa o número. */}
            <span className={styles.countUnit}>
              {location.appointments_count === 1 ? ' atendimento' : ' atendimentos'}
            </span>
          </span>
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
