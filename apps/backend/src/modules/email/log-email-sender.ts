import { Logger } from '@nestjs/common';
import type { EmailMessage, EmailSender } from './email-sender';

/**
 * Sem provedor configurado: escreve o e-mail no log em vez de enviar. Serve
 * para desenvolvimento e testes; em produção só avisa, para não vazar o link.
 */
export class LogEmailSender implements EmailSender {
  private readonly logger = new Logger(LogEmailSender.name);

  constructor(private readonly isProduction: boolean) {}

  async send(message: EmailMessage): Promise<void> {
    if (this.isProduction) {
      this.logger.warn(`Provedor de e-mail não configurado: "${message.subject}" não foi enviado.`);
      return;
    }
    this.logger.log(`E-mail para ${message.to} — ${message.subject}\n${message.text}`);
  }
}
