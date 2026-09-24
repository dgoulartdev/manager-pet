import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CircleCheck, TriangleAlert, X } from 'lucide-react';
import styles from './Toast.module.css';

interface ToastMessage {
  id: number;
  tone: 'success' | 'warning';
  title: string;
  description?: string;
}

type ShowToast = (toast: Omit<ToastMessage, 'id'>) => void;

const ToastContext = createContext<ShowToast | null>(null);
const DISMISS_AFTER_MS = 6000;

/**
 * Confirmações efêmeras (DS: toast só para isso; erro que exige ação fica
 * inline). A região é aria-live="polite": o leitor de tela anuncia sem interromper.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback<ShowToast>(
    (toast) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { ...toast, id }]);
      window.setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = toast.tone === 'success' ? CircleCheck : TriangleAlert;
          return (
            <div key={toast.id} className={`${styles.toast} ${styles[toast.tone]}`}>
              <Icon className={styles.icon} size={20} strokeWidth={1.75} aria-hidden="true" />
              <div className={styles.text}>
                <p className={styles.title}>{toast.title}</p>
                {toast.description && <p className={styles.description}>{toast.description}</p>}
              </div>
              <button
                type="button"
                className={styles.close}
                aria-label="Fechar aviso"
                onClick={() => dismiss(toast.id)}
              >
                <X size={18} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast precisa estar dentro de <ToastProvider>.');
  return show;
}
