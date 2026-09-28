import { Logger } from '@nestjs/common';
import type { EmailMessage, EmailSender } from './email-sender';

const RESEND_API_URL = 'https://api.resend.com/emails';

/**
 * Envio pelo Resend (API HTTP, sem SDK). Sem domínio verificado no Resend, o
 * remetente de teste (onboarding@resend.dev) só entrega para o e-mail da conta.
 */
export class ResendEmailSender implements EmailSender {
  private readonly logger = new Logger(ResendEmailSender.name);

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!response.ok) {
      // O corpo traz o motivo (ex.: domínio não verificado); nunca a chave.
      const detail = await response.text();
      throw new Error(`Resend respondeu ${response.status}: ${detail}`);
    }

    this.logger.log(`E-mail "${message.subject}" enviado.`);
  }
}
