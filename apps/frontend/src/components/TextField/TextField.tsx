import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import styles from './TextField.module.css';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  // DS: marca-se o opcional, não o obrigatório (a API tem muitos campos anuláveis).
  optional?: boolean;
  error?: string;
  hint?: string;
  // Ação ao lado do rótulo, como o link "Esqueci minha senha".
  labelAction?: ReactNode;
  // Elemento dentro do campo, à direita (ex.: botão de mostrar senha).
  trailing?: ReactNode;
  // Conteúdo entre o campo e a mensagem (ex.: medidor de força da senha).
  below?: ReactNode;
  // Ids extras que descrevem o campo, somados ao da mensagem.
  describedBy?: string;
}

/**
 * Anatomia do DS: rótulo sempre visível → campo → ajuda ou erro.
 * O erro fica ligado ao campo por aria-describedby e marca aria-invalid.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, optional, error, hint, labelAction, trailing, below, describedBy, id, className, ...inputProps },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;
  const descriptionIds = [describedBy, message ? messageId : undefined].filter(Boolean).join(' ');
  const trailingContent =
    trailing ?? (error ? <CircleAlert size={18} strokeWidth={1.75} aria-hidden="true" /> : null);

  return (
    <div className={[styles.field, className ?? ''].join(' ')}>
      <div className={styles.labelRow}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {optional && <span className={styles.optional}> (opcional)</span>}
        </label>
        {labelAction}
      </div>
      <div className={styles.control} data-invalid={error ? 'true' : undefined}>
        <input
          ref={ref}
          id={inputId}
          className={styles.input}
          data-has-trailing={trailingContent ? 'true' : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptionIds || undefined}
          {...inputProps}
        />
        {trailingContent && <div className={styles.trailing}>{trailingContent}</div>}
      </div>
      {below}
      {message && (
        <p id={messageId} className={error ? styles.error : styles.hint}>
          {message}
        </p>
      )}
    </div>
  );
});
