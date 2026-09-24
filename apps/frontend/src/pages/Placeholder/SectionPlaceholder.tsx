import type { ReactNode } from 'react';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { Avatar } from '../../components/Avatar/Avatar';
import { Button, ButtonLink } from '../../components/Button/Button';
import styles from './SectionPlaceholder.module.css';

interface SectionPlaceholderProps {
  title: string;
  description: string;
  children?: ReactNode;
}

// Provisória: destino das seções que ainda serão construídas.
export function SectionPlaceholder({ title, description, children }: SectionPlaceholderProps) {
  useDocumentTitle(title);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      {children}
      <p className={styles.notice}>Esta tela ainda está em construção.</p>
      <ButtonLink
        to="/pacientes"
        variant="secondary"
        className={styles.back}
        icon={<ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />}
      >
        Voltar para pacientes
      </ButtonLink>
    </div>
  );
}

// Perfil provisório: no mobile é o único lugar com "Sair".
export function ProfilePlaceholder() {
  const { state, logout } = useAuth();
  const user = state.status === 'authenticated' ? state.user : null;

  return (
    <SectionPlaceholder title="Perfil" description="Seus dados de acesso e a troca de senha ficarão aqui.">
      {user && (
        <div className={styles.account}>
          <Avatar name={user.name} kind="person" size="lg" />
          <div className={styles.accountText}>
            <span className={styles.accountName}>{user.name}</span>
            <span className={styles.accountEmail}>{user.email}</span>
          </div>
          <Button
            variant="secondary"
            icon={<LogOut size={18} strokeWidth={1.75} aria-hidden="true" />}
            onClick={logout}
          >
            Sair
          </Button>
        </div>
      )}
    </SectionPlaceholder>
  );
}
