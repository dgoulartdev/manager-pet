import type { AuthResponse } from '@meupaciente/shared';
import { clearSession, getAccessToken, readRefreshToken, saveSession } from './session';

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/v1').replace(/\/$/, '');

export interface FieldError {
  field: string;
  message: string;
}

/** Erro devolvido pela API no formato RFC 7807 (application/problem+json). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
    readonly fieldErrors: FieldError[] = [],
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

/** A requisição nem chegou a ter resposta (sem internet, servidor fora do ar). */
export class NetworkError extends Error {
  constructor() {
    super('Não foi possível conectar ao servidor.');
    this.name = 'NetworkError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  // Objeto vira JSON; FormData (upload de arquivo) vai como multipart.
  body?: unknown;
  // false nas rotas públicas de /auth: não envia token nem tenta renovar a sessão.
  auth?: boolean;
}

type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

/** Avisa quando a sessão não pôde ser renovada e o usuário precisa entrar de novo. */
export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, auth = true }: RequestOptions = {},
): Promise<T> {
  const isFormData = body instanceof FormData;
  const send = () =>
    sendRequest(path, {
      method,
      // Multipart: o navegador define o Content-Type com o boundary sozinho.
      headers: buildHeaders(body !== undefined && !isFormData, auth),
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });

  let response = await send();

  // Access token expirado (vale 15min): renova uma vez e repete a requisição.
  if (response.status === 401 && auth && readRefreshToken()) {
    try {
      await refreshSession();
    } catch (error) {
      if (error instanceof ApiError) notifySessionExpired();
      throw error;
    }
    response = await send();
  }

  return parseResponse<T>(response);
}

let refreshInFlight: Promise<AuthResponse> | null = null;

/**
 * Troca o refresh token guardado por um novo par de tokens.
 * A API faz rotação: cada refresh token só pode ser usado uma vez. Por isso
 * chamadas simultâneas compartilham a mesma requisição, senão a segunda
 * usaria um token já revogado e derrubaria a sessão.
 */
export function refreshSession(): Promise<AuthResponse> {
  if (refreshInFlight) return refreshInFlight;

  const stored = readRefreshToken();
  if (!stored) {
    return Promise.reject(new ApiError(401, 'Sessão expirada.'));
  }

  refreshInFlight = apiRequest<AuthResponse>('/auth/refresh', {
    method: 'POST',
    body: { refresh_token: stored.token },
    auth: false,
  })
    .then((tokens) => {
      saveSession(tokens, stored.remember);
      return tokens;
    })
    .catch((error: unknown) => {
      // Só descarta a sessão se a API recusou o token; queda de rede não.
      if (error instanceof ApiError && error.status === 401) clearSession();
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

function buildHeaders(hasJsonBody: boolean, auth: boolean): HeadersInit {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (hasJsonBody) headers['Content-Type'] = 'application/json';
  const token = getAccessToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function sendRequest(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new NetworkError();
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);
  if (response.ok) return payload as T;

  const problem = (payload ?? {}) as { detail?: unknown; errors?: unknown };
  throw new ApiError(
    response.status,
    typeof problem.detail === 'string' ? problem.detail : response.statusText,
    Array.isArray(problem.errors) ? (problem.errors as FieldError[]) : [],
  );
}

function notifySessionExpired(): void {
  clearSession();
  sessionExpiredListeners.forEach((listener) => listener());
}
