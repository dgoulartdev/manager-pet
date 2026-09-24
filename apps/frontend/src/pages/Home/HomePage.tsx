import { LogOut } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { BrandMark } from '../../components/BrandMark/BrandMark';
import { Button } from '../../components/Button/Button';
import styles from './HomePage.module.css';

// Provisória: confirma a sessão e permite sair até a Home real ser construída.
export function HomePage() {
  const { state, logout } = useAuth();
  const userName = state.status === 'authenticated' ? state.user.name : '';

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <BrandMark />
        <Button
          variant="secondary"
          size="sm"
          icon={<LogOut size={16} strokeWidth={1.75} aria-hidden="true" />}
          onClick={logout}
        >
          Sair
        </Button>
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>Olá, {userName}</h1>
        <p className={styles.text}>
          A tela inicial, com seus pacientes e atendimentos, ainda está em construção.
        </p>
      </main>
    </div>
  );
}
