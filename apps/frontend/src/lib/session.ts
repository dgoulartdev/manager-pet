import type { AuthResponse } from '@meupaciente/shared';

/**
 * Onde os tokens ficam:
 * - access token: só em memória. Some ao recarregar a página e é recuperado
 *   com o refresh token, então nunca fica gravado no navegador.
 * - refresh token: localStorage quando o usuário marca "manter conectado"
 *   (sobrevive a fechar o navegador) ou sessionStorage quando não marca
 *   (termina ao fechar a aba). A API não tem esse parâmetro; é só no cliente.
 */

const REFRESH_TOKEN_KEY = 'meupaciente.refresh_token';

let accessToken: string | null = null;

export interface StoredRefreshToken {
  token: string;
  remember: boolean;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function saveSession(tokens: AuthResponse, remember: boolean): void {
  accessToken = tokens.access_token;
  removeFromStorages();
  const storage = remember ? safeLocalStorage() : safeSessionStorage();
  try {
    storage?.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  } catch {
    // Armazenamento bloqueado (modo privado, cota): a sessão vale até recarregar.
  }
}

export function readRefreshToken(): StoredRefreshToken | null {
  const remembered = readFrom(safeLocalStorage());
  if (remembered) return { token: remembered, remember: true };
  const temporary = readFrom(safeSessionStorage());
  if (temporary) return { token: temporary, remember: false };
  return null;
}

/**
 * Padrão de "manter conectado": sim em aparelho de toque (celular pessoal),
 * não no desktop, que pode ser um computador compartilhado da clínica.
 */
export function prefersRememberedSession(): boolean {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

export function clearSession(): void {
  accessToken = null;
  removeFromStorages();
}

function readFrom(storage: Storage | null): string | null {
  try {
    return storage?.getItem(REFRESH_TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

function removeFromStorages(): void {
  for (const storage of [safeLocalStorage(), safeSessionStorage()]) {
    try {
      storage?.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // Ignorado: nada a limpar se o armazenamento está bloqueado.
    }
  }
}

// O simples acesso a window.localStorage pode lançar erro com cookies bloqueados.
function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function safeSessionStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
