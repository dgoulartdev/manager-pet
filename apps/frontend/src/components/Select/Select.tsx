import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import field from '../TextField/TextField.module.css';
import styles from './Select.module.css';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  optional?: boolean;
  error?: string;
  hint?: string;
  labelAction?: ReactNode;
}

/**
 * Select nativo com a geometria do input + chevron (DS). Para listas curtas e
 * fechadas; no celular abre o seletor do próprio sistema.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, optional, error, hint, labelAction, id, className, children, ...selectProps },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const messageId = `${selectId}-message`;
  const message = error ?? hint;

  return (
    <div className={[field.field, className ?? ''].join(' ')}>
      <div className={field.labelRow}>
        <label htmlFor={selectId} className={field.label}>
          {label}
          {optional && <span className={field.optional}> (opcional)</span>}
        </label>
        {labelAction}
      </div>
      <div className={field.control} data-invalid={error ? 'true' : undefined}>
        <select
          ref={ref}
          id={selectId}
          className={`${field.input} ${styles.select}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          {...selectProps}
        >
          {children}
        </select>
        <ChevronDown className={styles.chevron} size={18} strokeWidth={1.75} aria-hidden="true" />
      </div>
      {message && (
        <p id={messageId} className={error ? field.error : field.hint}>
          {message}
        </p>
      )}
    </div>
  );
});
