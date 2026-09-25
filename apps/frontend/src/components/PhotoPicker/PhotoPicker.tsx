import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { Camera } from 'lucide-react';
import { ACCEPTED_PHOTO_TYPES, validatePhoto } from '../../lib/photo';
import { Button } from '../Button/Button';
import styles from './PhotoPicker.module.css';

interface PhotoPickerProps {
  file: File | null;
  onChange: (file: File | null) => void;
  // Edição: a foto que o paciente já tem, mostrada enquanto nenhuma nova é escolhida.
  currentUrl?: string | null;
}

/**
 * Foto opcional do paciente. Valida tipo e tamanho aqui, antes de enviar:
 * a foto só sobe depois que o paciente é salvo (a API exige o id).
 */
export function PhotoPicker({ file, onChange, currentUrl = null }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shownUrl = previewUrl ?? currentUrl;

  function accept(candidate: File | undefined) {
    if (!candidate) return;
    const problem = validatePhoto(candidate);
    setError(problem);
    if (problem) return;
    onChange(candidate);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    accept(event.dataTransfer.files[0]);
  }

  return (
    <div className={styles.picker}>
      {/* Alvo de mouse/toque (clicar ou arrastar). No teclado, o botão ao lado faz o mesmo. */}
      <button
        type="button"
        className={styles.dropzone}
        data-dragging={dragging || undefined}
        data-filled={shownUrl ? true : undefined}
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {shownUrl ? (
          <img className={styles.preview} src={shownUrl} alt="" />
        ) : (
          <>
            <Camera size={24} strokeWidth={1.75} aria-hidden="true" />
            <span className={styles.dropText}>Arraste ou clique</span>
          </>
        )}
      </button>

      <div className={styles.details}>
        <p className={styles.title}>Foto</p>
        <p
          id={hintId}
          className={error ? styles.error : styles.hint}
          role={error ? 'alert' : undefined}
        >
          {error ?? 'Opcional. JPG ou PNG, até 5 MB. Enviada logo depois de salvar.'}
        </p>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            aria-describedby={hintId}
            onClick={() => inputRef.current?.click()}
          >
            {shownUrl ? 'Trocar foto' : 'Escolher foto'}
          </Button>
          {file && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange(null);
                setError(null);
              }}
            >
              {/* Com foto atual, tirar a escolhida só volta para ela. */}
              {currentUrl ? 'Manter a atual' : 'Remover'}
            </Button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_PHOTO_TYPES.join(',')}
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          accept(event.target.files?.[0]);
          // Permite escolher o mesmo arquivo de novo depois de remover.
          event.target.value = '';
        }}
      />
    </div>
  );
}
