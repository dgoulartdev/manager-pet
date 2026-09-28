import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './Dialog.module.css';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  // DS: sm 420px (padrão) · md 560px para formulários com mais conteúdo.
  size?: 'sm' | 'md';
  children: ReactNode;
}

/**
 * Modal do DS sobre o <dialog> nativo: prende o foco, fecha com Esc e devolve
 * o foco a quem o abriu. No mobile vira bottom sheet (ver CSS).
 * Vai para o <body> por portal: assim pode ter o próprio <form> mesmo quando
 * aberto de dentro de outro formulário.
 */
export function Dialog({ open, onClose, title, description, size = 'sm', children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // O <dialog> focaria o primeiro botão (fechar); o campo principal é mais útil.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`${styles.dialog} ${styles[size]}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // Esc e o botão de fechar passam por aqui para o estado do React acompanhar.
      onClose={onClose}
      // Clique fora do conteúdo (no fundo escurecido) fecha.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      {open && (
        <div className={styles.content}>
          <header className={styles.header}>
            <div className={styles.heading}>
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className={styles.description}>
                  {description}
                </p>
              )}
            </div>
            <button type="button" className={styles.close} aria-label="Fechar" onClick={onClose}>
              <X size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>,
    document.body,
  );
}
