import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../lib/api';
import { Alert } from '../Alert/Alert';
import { Button } from '../Button/Button';
import { Dialog } from '../Dialog/Dialog';
import styles from './DeleteDialog.module.css';

interface DeleteDialogProps {
  open: boolean;
  // Nome do registro, nos títulos: "Excluir Ana Souza?".
  name: string;
  // Consequência real da exclusão (DS), mostrada na confirmação.
  consequence: string;
  confirmLabel: string;
  // Vínculos que a API não deixa apagar (responde 409). Se a lista já sabe
  // que existem, a explicação aparece no lugar da confirmação; um 409
  // inesperado (vínculo criado em outra aba) leva à mesma explicação.
  // Sem blockedReason, é uma confirmação simples.
  blocked?: boolean;
  blockedReason?: { title: string; description: string };
  onConfirm: () => Promise<void>;
  // 409: os dados da tela estavam desatualizados (ex.: recarregar a lista).
  onConflict?: () => void;
  onClose: () => void;
}

/**
 * Confirmação de exclusão (DS: descreve a consequência real). Para cadastros
 * com vínculos (tutor com pacientes, local com atendimentos), o bloqueio da
 * API vira um aviso explicativo, não um erro.
 */
export function DeleteDialog({
  open,
  name,
  consequence,
  confirmLabel,
  blocked = false,
  blockedReason,
  onConfirm,
  onConflict,
  onClose,
}: DeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [conflict, setConflict] = useState(false);
  const backRef = useRef<HTMLButtonElement>(null);
  const isBlocked = Boolean(blockedReason) && (blocked || conflict);

  useEffect(() => {
    if (!open) return;
    setDeleting(false);
    setFailed(false);
    setConflict(false);
  }, [open]);

  // O 409 troca a confirmação pela explicação: o foco vai para o botão que sobrou.
  useEffect(() => {
    if (conflict) backRef.current?.focus();
  }, [conflict]);

  async function confirm() {
    setDeleting(true);
    setFailed(false);
    try {
      await onConfirm();
    } catch (error) {
      if (blockedReason && error instanceof ApiError && error.status === 409) {
        setConflict(true);
        onConflict?.();
      } else {
        setFailed(true);
      }
      setDeleting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isBlocked ? `Não é possível excluir ${name}` : `Excluir ${name}?`}
      description={isBlocked ? undefined : `${consequence} Não é possível desfazer.`}
    >
      {isBlocked && blockedReason ? (
        <Alert tone="warning" title={blockedReason.title}>
          {blockedReason.description}
        </Alert>
      ) : (
        failed && (
          <Alert tone="error" title="Não foi possível excluir">
            Verifique sua conexão e tente de novo.
          </Alert>
        )
      )}
      <div className={styles.actions}>
        {isBlocked ? (
          <Button ref={backRef} variant="secondary" onClick={onClose} data-autofocus>
            Voltar
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} data-autofocus>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              loading={deleting}
              loadingLabel="Excluindo…"
              onClick={confirm}
            >
              {confirmLabel}
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
}
