import { useEffect } from 'react';

/** Título da aba: "Pacientes · MeuPaciente". */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · MeuPaciente`;
  }, [title]);
}
