import { PawPrint } from 'lucide-react';
import styles from './BrandMark.module.css';

interface BrandMarkProps {
  // "panel": sobre o painel teal escuro · "surface": sobre fundo claro/escuro comum.
  tone?: 'panel' | 'surface';
  size?: 'md' | 'lg';
  showName?: boolean;
}

export function BrandMark({ tone = 'surface', size = 'md', showName = true }: BrandMarkProps) {
  return (
    <div className={`${styles.brand} ${styles[tone]} ${styles[size]}`}>
      <span className={styles.tile} aria-hidden="true">
        <PawPrint size={size === 'lg' ? 24 : 20} strokeWidth={2} />
      </span>
      {showName && <span className={styles.name}>MeuPaciente</span>}
    </div>
  );
}
