import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { initialsOf } from '../../lib/format';
import styles from './Avatar.module.css';

interface AvatarProps {
  name: string;
  // paciente usa o acento terracota; pessoa (usuário, tutor) usa o primário.
  kind: 'patient' | 'person';
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  expandable?: boolean;
}

// Decorativo por padrão (o nome sempre aparece ao lado); quando ampliável e com foto, vira botão que abre o lightbox.
export function Avatar({ name, kind, photoUrl, size = 'md', expandable = false }: AvatarProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canExpand = expandable && Boolean(photoUrl);

  useEffect(() => {
    if (!canExpand) {
      setOpen(false);
      return;
    }
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open, canExpand]);

  if (!canExpand || !photoUrl) {
    return (
      <span className={`${styles.avatar} ${styles[kind]} ${styles[size]}`} aria-hidden="true">
        {photoUrl ? <img className={styles.photo} src={photoUrl} alt="" /> : initialsOf(name)}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`${styles.avatar} ${styles[kind]} ${styles[size]} ${styles.expandable}`}
        aria-label={`Ampliar foto de ${name}`}
        onClick={() => setOpen(true)}
      >
        <img className={styles.photo} src={photoUrl} alt="" />
      </button>
      {createPortal(
        <dialog
          ref={dialogRef}
          className={styles.lightbox}
          aria-label={`Foto de ${name}`}
          onClose={() => setOpen(false)}
          onClick={(event) => {
            if (event.target === dialogRef.current) setOpen(false);
          }}
        >
          {open && (
            <div
              className={styles.lightboxContent}
              onClick={(event) => {
                if (event.target === event.currentTarget) setOpen(false);
              }}
            >
              <img className={styles.lightboxImage} src={photoUrl} alt={`Foto de ${name}`} />
              <button
                type="button"
                className={styles.close}
                aria-label="Fechar"
                onClick={() => setOpen(false)}
              >
                <X size={20} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          )}
        </dialog>,
        document.body,
      )}
    </>
  );
}
