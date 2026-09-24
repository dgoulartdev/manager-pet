import { CircleUserRound, LogOut, MapPin, PawPrint, UsersRound, type LucideIcon } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Avatar } from '../Avatar/Avatar';
import { BrandMark } from '../BrandMark/BrandMark';
import styles from './AppShell.module.css';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

// Seções do MVP. Agenda, financeiro etc. estão fora do escopo (architecture.md).
const SECTIONS: NavItem[] = [
  { to: '/pacientes', label: 'Pacientes', icon: PawPrint },
  { to: '/tutores', label: 'Tutores', icon: UsersRound },
  { to: '/locais', label: 'Locais', icon: MapPin },
];

const PROFILE: NavItem = { to: '/perfil', label: 'Perfil', icon: CircleUserRound };

/**
 * Estrutura das telas internas (DS, seção Grid):
 * ≥ 1024 barra lateral de 240px · 768–1023 trilho de 72px · < 768 abas no rodapé.
 */
export function AppShell() {
  const { state, logout } = useAuth();
  const user = state.status === 'authenticated' ? state.user : null;

  return (
    <div className={styles.shell}>
      <a href="#conteudo" className={styles.skipLink}>
        Pular para o conteúdo
      </a>

      <aside className={styles.sidebar}>
        <Link to="/pacientes" className={styles.brand} aria-label="MeuPaciente — início">
          <span className={styles.brandFull}>
            <BrandMark size="md" />
          </span>
          <span className={styles.brandCompact}>
            <BrandMark size="md" showName={false} />
          </span>
        </Link>

        <nav aria-label="Principal" className={styles.nav}>
          {SECTIONS.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
          <span className={styles.railOnly}>
            <SidebarLink item={PROFILE} />
          </span>
        </nav>

        {user && (
          <div className={styles.account}>
            <Link to="/perfil" className={styles.accountLink}>
              <Avatar name={user.name} kind="person" size="sm" />
              <span className={styles.accountText}>
                <span className={styles.accountName}>{user.name}</span>
                <span className={styles.accountEmail}>{user.email}</span>
              </span>
            </Link>
            <button type="button" className={styles.logout} aria-label="Sair" title="Sair" onClick={logout}>
              <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        )}
      </aside>

      <main id="conteudo" className={styles.content} tabIndex={-1}>
        <Outlet />
      </main>

      <nav aria-label="Principal" className={styles.tabBar}>
        {[...SECTIONS, PROFILE].map((item) => (
          <NavLink key={item.to} to={item.to} className={styles.tab}>
            <item.icon size={22} strokeWidth={1.75} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <NavLink to={item.to} className={styles.navLink}>
      <item.icon size={20} strokeWidth={1.75} aria-hidden="true" />
      <span className={styles.navLabel}>{item.label}</span>
    </NavLink>
  );
}
