import { Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import type { EmailMessage, EmailSender } from './email-sender';

export interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  password: string;
}

// Limites curtos: uma conexão travada precisa falhar (e aparecer no log) antes do
// prazo da função na hospedagem, não minutos depois, como no padrão do nodemailer.
const CONNECTION_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 20_000;

/**
 * Envio por SMTP (ADR-011) — hoje, uma conta Gmail com senha de app. Não precisa de
 * domínio próprio: o remetente é a conta autenticada. Na porta 465 a conexão já
 * nasce criptografada; nas outras (587), o nodemailer passa para TLS com STARTTLS.
 */
export class SmtpEmailSender implements EmailSender {
  private readonly logger = new Logger(SmtpEmailSender.name);
  private readonly transporter: Transporter;

  constructor(
    settings: SmtpSettings,
    private readonly from: string,
  ) {
    this.transporter = createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.port === 465,
      auth: { user: settings.user, pass: settings.password },
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      greetingTimeout: CONNECTION_TIMEOUT_MS,
      socketTimeout: SOCKET_TIMEOUT_MS,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    this.logger.log(`E-mail "${message.subject}" enviado.`);
  }
}
