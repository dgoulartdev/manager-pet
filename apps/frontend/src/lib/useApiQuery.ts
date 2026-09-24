import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from './api';

interface QueryState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
}

/**
 * Busca um GET da API e refaz quando o caminho muda. Mantém o último dado
 * enquanto carrega o próximo (troca de página ou busca sem piscar a tela) e
 * descarta respostas que chegam depois de o caminho já ter mudado.
 */
export function useApiQuery<T>(path: string) {
  const [state, setState] = useState<QueryState<T>>({
    data: undefined,
    error: undefined,
    loading: true,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setState((previous) => ({ ...previous, error: undefined, loading: true }));
    apiRequest<T>(path)
      .then((data) => {
        if (current) setState({ data, error: undefined, loading: false });
      })
      .catch((error: unknown) => {
        if (current) setState((previous) => ({ ...previous, error, loading: false }));
      });
    return () => {
      current = false;
    };
  }, [path, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, retry };
}
