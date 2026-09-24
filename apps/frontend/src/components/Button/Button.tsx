import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  // Texto durante o carregamento (ex.: "Entrando…"). Sem ele, o texto se mantém.
  loadingLabel?: string;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  loadingLabel,
  icon,
  className,
  children,
  onClick,
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    className ?? '',
  ].join(' ');

  return (
    <button
      type="button"
      {...props}
      className={classes}
      // aria-disabled em vez de disabled durante o carregamento: o botão
      // continua focável e o leitor de tela anuncia o estado ocupado.
      aria-disabled={loading || props.disabled || undefined}
      aria-busy={loading || undefined}
      onClick={(event) => {
        if (loading) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : icon}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
