import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AppShell } from './components/AppShell/AppShell';
import { LoginPage } from './pages/Login/LoginPage';
import { PatientsPage } from './pages/Patients/PatientsPage';
import { ProfilePlaceholder, SectionPlaceholder } from './pages/Placeholder/SectionPlaceholder';
import { RegisterPage } from './pages/Register/RegisterPage';
import { UnderConstructionPage } from './pages/UnderConstruction/UnderConstructionPage';
import styles from './App.module.css';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/entrar"
            element={
              <PublicOnly>
                <LoginPage />
              </PublicOnly>
            }
          />
          <Route
            path="/criar-conta"
            element={
              <PublicOnly>
                <RegisterPage />
              </PublicOnly>
            }
          />
          <Route
            path="/esqueci-senha"
            element={
              <PublicOnly>
                <UnderConstructionPage title="Recuperar acesso" />
              </PublicOnly>
            }
          />

          {/* Telas internas: todas dentro da estrutura com navegação. */}
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="/pacientes" element={<PatientsPage />} />
            <Route
              path="/pacientes/novo"
              element={
                <SectionPlaceholder
                  title="Novo paciente"
                  description="Cadastro com nome, espécie, tutor e foto."
                />
              }
            />
            <Route
              path="/pacientes/:patientId"
              element={
                <SectionPlaceholder
                  title="Prontuário"
                  description="Dados do paciente, histórico de atendimentos e vacinas."
                />
              }
            />
            <Route
              path="/tutores"
              element={<SectionPlaceholder title="Tutores" description="Cadastro e busca dos tutores dos seus pacientes." />}
            />
            <Route
              path="/locais"
              element={<SectionPlaceholder title="Locais" description="Clínicas e consultórios onde você atende." />}
            />
            <Route path="/perfil" element={<ProfilePlaceholder />} />
          </Route>

          <Route path="*" element={<Navigate to="/pacientes" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// Rotas internas: sem sessão, vai para o login e volta para cá depois de entrar.
function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === 'loading') return <SessionLoading />;
  if (state.status === 'anonymous') {
    return <Navigate to="/entrar" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}

// Telas de entrada: quem já tem sessão não precisa vê-las.
function PublicOnly({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === 'loading') return <SessionLoading />;
  if (state.status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from ?? '/pacientes';
    return <Navigate to={from} replace />;
  }
  return children;
}

function SessionLoading() {
  return (
    <div className={styles.loading} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      <span className="visually-hidden">Carregando sua sessão</span>
    </div>
  );
}
