import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'accent';

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

/** DS: fundo tonal + texto escuro da mesma escala; nunca cor saturada com texto branco. */
export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
