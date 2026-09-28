import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';
import styles from './SearchField.module.css';

interface SearchFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange'
> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  // Mostra a tecla de atalho quando o campo está vazio (só em telas com teclado).
  shortcut?: string;
  // Rótulo visível acima do campo (ex.: "Tutor" num formulário). Padrão: oculto.
  showLabel?: boolean;
  invalid?: boolean;
}

/**
 * Busca: ícone, botão de limpar e rótulo acessível. O rótulo fica oculto
 * visualmente porque o ícone e o placeholder já dizem o que o campo faz.
 */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  {
    label,
    value,
    onChange,
    shortcut,
    showLabel = false,
    invalid = false,
    className,
    id,
    ...inputProps
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={[styles.wrapper, className ?? ''].join(' ')}>
      <label htmlFor={inputId} className={showLabel ? styles.label : 'visually-hidden'}>
        {label}
      </label>
      <div className={styles.field} data-invalid={invalid || undefined}>
        <Search className={styles.icon} size={18} strokeWidth={1.75} aria-hidden="true" />
        <input
          ref={ref}
          id={inputId}
          type="search"
          className={styles.input}
          value={value}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && value) {
              event.preventDefault();
              onChange('');
            }
          }}
          {...inputProps}
        />
        {value ? (
          <button
            type="button"
            className={styles.clear}
            aria-label="Limpar busca"
            onClick={() => onChange('')}
          >
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        ) : (
          shortcut && (
            <kbd className={styles.shortcut} aria-hidden="true">
              {shortcut}
            </kbd>
          )
        )}
      </div>
    </div>
  );
});
