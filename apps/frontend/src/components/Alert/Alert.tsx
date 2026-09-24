import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react';
import styles from './Alert.module.css';

interface AlertProps {
  tone: 'error' | 'warning' | 'success';
  title: string;
  children?: ReactNode;
}

const ICONS = {
  error: CircleAlert,
  warning: TriangleAlert,
  success: CircleCheck,
};

/** Cor nunca carrega o significado sozinha: sempre ícone + título + texto. */
export function Alert({ tone, title, children }: AlertProps) {
  const Icon = ICONS[tone];
  return (
    <div className={`${styles.alert} ${styles[tone]}`} role={tone === 'success' ? 'status' : 'alert'}>
      <Icon className={styles.icon} size={20} strokeWidth={1.75} aria-hidden="true" />
      <div>
        <p className={styles.title}>{title}</p>
        {children && <p className={styles.body}>{children}</p>}
      </div>
    </div>
  );
}
