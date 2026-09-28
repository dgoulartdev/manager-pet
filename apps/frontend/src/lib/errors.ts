import { ApiError, NetworkError } from './api';

export interface FormMessage {
  tone: 'error' | 'warning';
  title: string;
  description: string;
}

/**
 * Mensagem para os erros que qualquer formulário pode receber: sem conexão,
 * limite de tentativas (429) e falha inesperada. Os casos próprios de cada
 * tela (401 no login, 409 no cadastro...) são tratados antes, na própria tela.
 */
export function describeCommonError(error: unknown): FormMessage {
  if (error instanceof NetworkError) {
    return {
      tone: 'error',
      title: 'Sem conexão com o servidor',
      description: 'Verifique sua internet e tente de novo.',
    };
  }
  if (error instanceof ApiError && error.status === 429) {
    return {
      tone: 'warning',
      title: 'Muitas tentativas seguidas',
      description: 'Por segurança, aguarde 1 minuto antes de tentar de novo.',
    };
  }
  return {
    tone: 'error',
    title: 'Algo não saiu como esperado',
    description: 'Tente de novo em alguns instantes.',
  };
}
