import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserDto,
} from '@meupaciente/shared';
import { apiRequest, onSessionExpired, refreshSession } from '../lib/api';
import { clearSession, readRefreshToken, saveSession } from '../lib/session';

type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: UserDto }
  | { status: 'anonymous' };

interface AuthContextValue {
  state: AuthState;
  login: (credentials: LoginRequest, remember: boolean) => Promise<void>;
  // A API já devolve os tokens no cadastro: a conta criada entra direto.
  register: (data: RegisterRequest, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    readRefreshToken() ? { status: 'loading' } : { status: 'anonymous' },
  );

  // Ao abrir o app com um refresh token guardado, recupera a sessão sem pedir login.
  useEffect(() => {
    if (state.status !== 'loading') return;
    let cancelled = false;
    refreshSession()
      .then(({ user }) => {
        if (!cancelled) setState({ status: 'authenticated', user });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'anonymous' });
      });
    return () => {
      cancelled = true;
    };
  }, [state.status]);

  useEffect(
    () => onSessionExpired(() => setState({ status: 'anonymous' })),
    [],
  );

  const startSession = useCallback((tokens: AuthResponse, remember: boolean) => {
    saveSession(tokens, remember);
    setState({ status: 'authenticated', user: tokens.user });
  }, []);

  const login = useCallback(
    async (credentials: LoginRequest, remember: boolean) => {
      const tokens = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: credentials,
        auth: false,
      });
      startSession(tokens, remember);
    },
    [startSession],
  );

  const register = useCallback(
    async (data: RegisterRequest, remember: boolean) => {
      const tokens = await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: data,
        auth: false,
      });
      startSession(tokens, remember);
    },
    [startSession],
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest<void>('/auth/logout', { method: 'POST' });
    } catch {
      // Mesmo sem resposta da API, a sessão local é encerrada.
    } finally {
      clearSession();
      setState({ status: 'anonymous' });
    }
  }, []);

  const value = useMemo(
    () => ({ state, login, register, logout }),
    [state, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  }
  return context;
}
