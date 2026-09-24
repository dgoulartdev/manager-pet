import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import styles from './Button.module.css';

interface ButtonLookProps {
  // destructive: só dentro de confirmação (DS), nunca solto numa lista.
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

function buttonClasses(
  { variant = 'primary', size = 'md', fullWidth = false }: ButtonLookProps,
  extra?: string,
) {
  return [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    extra ?? '',
  ].join(' ');
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonLookProps {
  loading?: boolean;
  // Texto durante o carregamento (ex.: "Entrando…"). Sem ele, o texto se mantém.
  loadingLabel?: string;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
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
  },
  ref,
) {
  const classes = buttonClasses({ variant, size, fullWidth }, className);

  return (
    <button
      ref={ref}
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
});

interface ButtonLinkProps extends LinkProps, ButtonLookProps {
  icon?: ReactNode;
}

/** Navegação com aparência de botão: é um link de verdade (abre em nova aba, etc.). */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  icon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link {...props} className={buttonClasses({ variant, size, fullWidth }, className)}>
      {icon}
      {children}
    </Link>
  );
}
