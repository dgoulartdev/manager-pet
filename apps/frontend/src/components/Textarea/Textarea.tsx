import {
  forwardRef,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type TextareaHTMLAttributes,
} from 'react';
import field from '../TextField/TextField.module.css';
import styles from './Textarea.module.css';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  optional?: boolean;
  error?: string;
  hint?: string;
  minRows?: number;
  maxRows?: number;
}

/**
 * Campo de texto longo que cresce com o conteúdo (DS: auto-grow de 3 a 12
 * linhas nos campos do atendimento). Passando do limite, rola por dentro.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    optional,
    error,
    hint,
    minRows = 3,
    maxRows = 12,
    id,
    className,
    value,
    ...textareaProps
  },
  ref,
) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const messageId = `${textareaId}-message`;
  const message = error ?? hint;

  // Recalcula a altura a cada mudança de texto, entre o mínimo e o máximo de linhas.
  useLayoutEffect(() => {
    const element = innerRef.current;
    if (!element) return;
    const style = window.getComputedStyle(element);
    const lineHeight = parseFloat(style.lineHeight);
    const chrome =
      parseFloat(style.paddingTop) +
      parseFloat(style.paddingBottom) +
      parseFloat(style.borderTopWidth) +
      parseFloat(style.borderBottomWidth);
    element.style.height = 'auto';
    const content =
      element.scrollHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const lines = Math.min(maxRows, Math.max(minRows, Math.ceil(content / lineHeight)));
    element.style.height = `${lines * lineHeight + chrome}px`;
    element.style.overflowY = content / lineHeight > maxRows ? 'auto' : 'hidden';
  }, [value, minRows, maxRows]);

  return (
    <div className={[field.field, className ?? ''].join(' ')}>
      <div className={field.labelRow}>
        <label htmlFor={textareaId} className={field.label}>
          {label}
          {optional && <span className={field.optional}> (opcional)</span>}
        </label>
      </div>
      <div className={field.control} data-invalid={error ? 'true' : undefined}>
        <textarea
          ref={innerRef}
          id={textareaId}
          className={`${field.input} ${styles.textarea}`}
          rows={minRows}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          {...textareaProps}
        />
      </div>
      {message && (
        <p id={messageId} className={error ? field.error : field.hint}>
          {message}
        </p>
      )}
    </div>
  );
});
