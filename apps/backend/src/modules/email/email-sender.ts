/**
 * Envio de e-mail transacional (hoje, só a recuperação de senha).
 *
 * Mesmo desenho do storage de foto (ADR-007): o AuthService depende só deste
 * contrato. Trocar de provedor é uma nova classe e o binding no EmailModule.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  // Versão em texto puro: leitores de e-mail sem HTML e filtros de spam.
  text: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

// Token de injeção do provedor de e-mail.
export const EMAIL_SENDER = Symbol('EMAIL_SENDER');
