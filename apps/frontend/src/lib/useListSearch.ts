import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Busca e página de uma lista vivem na URL (?q= e ?pagina=): voltar de outra
 * tela devolve a mesma lista. A digitação só chega à URL depois de uma pausa,
 * e "/" leva à busca de qualquer ponto da tela (atalho do DS).
 */
export function useListSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const page = Math.max(1, Number(searchParams.get('pagina')) || 1);

  const [searchText, setSearchText] = useState(query);
  const searchRef = useRef<HTMLInputElement>(null);

  // Voltar/avançar no navegador muda a URL: a caixa de busca acompanha.
  useEffect(() => {
    setSearchText((current) => (current.trim() === query ? current : query));
  }, [query]);

  useEffect(() => {
    const term = searchText.trim();
    if (term === query) return;
    const timer = window.setTimeout(() => {
      setSearchParams(term ? { q: term } : {}, { replace: true });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchText, query, setSearchParams]);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      const target = event.target instanceof Element ? event.target : null;
      const typing = target?.closest('input, textarea, select, [contenteditable="true"]');
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  const goToPage = useCallback(
    (nextPage: number) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (nextPage > 1) next.set('pagina', String(nextPage));
        else next.delete('pagina');
        return next;
      });
      window.scrollTo({ top: 0 });
    },
    [setSearchParams],
  );

  // Volta ao início da lista, sem busca (ex.: para mostrar o item recém-cadastrado).
  const showAll = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return { query, page, searchText, setSearchText, searchRef, goToPage, showAll };
}
