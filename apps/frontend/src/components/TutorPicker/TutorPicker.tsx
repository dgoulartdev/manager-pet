import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { UserPlus } from 'lucide-react';
import type { TutorDto, TutorListResponse } from '@meupaciente/shared';
import { apiRequest } from '../../lib/api';
import { formatPhone, toSearchTerm } from '../../lib/format';
import { Avatar } from '../Avatar/Avatar';
import { Button } from '../Button/Button';
import { SearchField } from '../SearchField/SearchField';
import { TutorDialog } from '../TutorDialog/TutorDialog';
import styles from './TutorPicker.module.css';

const RESULTS_LIMIT = 6;
const SEARCH_DEBOUNCE_MS = 300;

interface TutorPickerProps {
  value: TutorDto | null;
  onChange: (tutor: TutorDto | null) => void;
  error?: string;
  // Quando um título de seção já diz "Tutor", o rótulo fica só para leitores de tela.
  labelHidden?: boolean;
}

export interface TutorPickerHandle {
  focus: () => void;
}

/**
 * Escolha do tutor (obrigatório no cadastro do paciente). Combobox ARIA:
 * busca por nome ou telefone, setas navegam, Enter escolhe, Esc fecha.
 * Quem ainda não existe é cadastrado na hora, sem sair do formulário.
 */
export const TutorPicker = forwardRef<TutorPickerHandle, TutorPickerProps>(function TutorPicker(
  { value, onChange, error, labelHidden = false },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const changeButtonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const messageId = useId();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<TutorDto[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [creating, setCreating] = useState(false);
  // Depois de escolher ou trocar, o foco segue para o próximo controle lógico.
  const [pendingFocus, setPendingFocus] = useState<'change' | 'input' | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => (inputRef.current ?? changeButtonRef.current)?.focus(),
  }));

  useEffect(() => {
    if (pendingFocus === 'change') changeButtonRef.current?.focus();
    if (pendingFocus === 'input') inputRef.current?.focus();
    setPendingFocus(null);
  }, [pendingFocus, value]);

  // Busca ao abrir (tutores recentes) e a cada pausa na digitação.
  useEffect(() => {
    if (!open) return;
    let current = true;
    setSearching(true);
    const timer = window.setTimeout(
      () => {
        const params = new URLSearchParams({ per_page: String(RESULTS_LIMIT) });
        const term = toSearchTerm(query);
        if (term) params.set('q', term);
        apiRequest<TutorListResponse>(`/tutors?${params}`)
          .then((response) => {
            if (!current) return;
            setResults(response.data);
            setSearchFailed(false);
            setActiveIndex(0);
          })
          .catch(() => {
            if (current) setSearchFailed(true);
          })
          .finally(() => {
            if (current) setSearching(false);
          });
      },
      query ? SEARCH_DEBOUNCE_MS : 0,
    );
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  // Última opção da lista é sempre "cadastrar novo tutor".
  const createIndex = results.length;
  const optionId = (index: number) => `${listId}-${index}`;

  function select(tutor: TutorDto) {
    onChange(tutor);
    setOpen(false);
    setQuery('');
    setPendingFocus('change');
  }

  function startCreating() {
    setOpen(false);
    setCreating(true);
  }

  function choose(index: number) {
    if (index < results.length) select(results[index]);
    else startCreating();
  }

  if (value) {
    const contact = [formatPhone(value.phone), value.email].filter(Boolean).join(' · ');
    return (
      <div className={styles.field} role="group" aria-labelledby={`${listId}-label`}>
        <span id={`${listId}-label`} className={labelHidden ? 'visually-hidden' : styles.label}>
          Tutor
        </span>
        <div className={styles.selected}>
          <Avatar name={value.name} kind="person" />
          <div className={styles.selectedText}>
            <span className={styles.selectedName}>{value.name}</span>
            {contact && <span className={styles.selectedContact}>{contact}</span>}
          </div>
          <Button
            ref={changeButtonRef}
            variant="secondary"
            size="sm"
            aria-label={`Trocar tutor (${value.name})`}
            onClick={() => {
              onChange(null);
              setPendingFocus('input');
            }}
          >
            Trocar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.field}>
      <div className={styles.combobox}>
        <SearchField
          ref={inputRef}
          label="Tutor"
          showLabel={!labelHidden}
          invalid={Boolean(error)}
          placeholder="Buscar tutor por nome ou telefone"
          value={query}
          onChange={(text) => {
            setQuery(text);
            setOpen(true);
          }}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? optionId(activeIndex) : undefined}
          aria-describedby={error ? messageId : undefined}
          onFocus={() => setOpen(true)}
          // Clicar no campo já focado (ex.: depois de fechar com Esc) reabre a lista.
          onClick={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              if (!open) return setOpen(true);
              const step = event.key === 'ArrowDown' ? 1 : -1;
              setActiveIndex((index) => (index + step + results.length + 1) % (results.length + 1));
            } else if (event.key === 'Enter' && open) {
              // Enter escolhe a opção em vez de enviar o formulário do paciente.
              event.preventDefault();
              choose(activeIndex);
            } else if (event.key === 'Escape' && open) {
              event.preventDefault();
              setOpen(false);
            }
          }}
        />

        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Tutores"
            className={styles.list}
            // Clicar numa opção não tira o foco do campo (senão a lista fecharia antes).
            onMouseDown={(event) => event.preventDefault()}
          >
            {searchFailed && (
              <li role="presentation" className={styles.status}>
                Não foi possível buscar os tutores. Verifique sua conexão.
              </li>
            )}
            {!searchFailed && !searching && query && results.length === 0 && (
              <li role="presentation" className={styles.status}>
                Nenhum tutor com “{query.trim()}”.
              </li>
            )}
            {!query && results.length > 0 && (
              <li role="presentation" className={styles.groupLabel}>
                Cadastrados recentemente
              </li>
            )}
            {results.map((tutor, index) => (
              <li
                key={tutor.id}
                id={optionId(index)}
                role="option"
                aria-selected={activeIndex === index}
                className={styles.option}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(tutor)}
              >
                <Avatar name={tutor.name} kind="person" size="sm" />
                <span className={styles.optionName}>{tutor.name}</span>
                {tutor.phone && (
                  <span className={styles.optionPhone}>{formatPhone(tutor.phone)}</span>
                )}
              </li>
            ))}
            <li
              id={optionId(createIndex)}
              role="option"
              aria-selected={activeIndex === createIndex}
              className={`${styles.option} ${styles.createOption}`}
              onMouseEnter={() => setActiveIndex(createIndex)}
              onClick={startCreating}
            >
              <span className={styles.createIcon} aria-hidden="true">
                <UserPlus size={16} strokeWidth={1.75} />
              </span>
              {query.trim()
                ? `Cadastrar “${query.trim()}” como novo tutor`
                : 'Cadastrar novo tutor'}
            </li>
          </ul>
        )}
      </div>

      {error && (
        <p id={messageId} className={styles.error}>
          {error}
        </p>
      )}

      <TutorDialog
        open={creating}
        initialText={query.trim()}
        createLabel="Cadastrar e vincular"
        onClose={() => {
          setCreating(false);
          setPendingFocus('input');
        }}
        onSaved={(tutor) => {
          setCreating(false);
          select(tutor);
        }}
      />
    </div>
  );
});
