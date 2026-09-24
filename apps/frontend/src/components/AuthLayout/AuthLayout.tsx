import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { BrandMark } from '../BrandMark/BrandMark';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  headline: string;
  description: string;
  highlights: string[];
  children: ReactNode;
}

/**
 * Estrutura das telas de entrada: painel de marca à esquerda (só ≥ 1024px)
 * e o formulário à direita — em tela cheia no mobile.
 */
export function AuthLayout({ headline, description, highlights, children }: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      <aside className={styles.brandPanel} aria-label="Sobre o MeuPaciente">
        <BrandMark tone="panel" />
        <div className={styles.pitch}>
          <p className={styles.headline}>{headline}</p>
          <p className={styles.description}>{description}</p>
          <ul className={styles.highlights}>
            {highlights.map((highlight) => (
              <li key={highlight}>
                <Check size={20} strokeWidth={2} aria-hidden="true" />
                {highlight}
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.panelFooter}>Para veterinários autônomos que atendem cães e gatos.</p>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
