import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_SENDER, EmailSender } from './email-sender';
import { LogEmailSender } from './log-email-sender';
import { ResendEmailSender } from './resend-email-sender';
import { SmtpEmailSender } from './smtp-email-sender';

// Remetente padrão do Resend, aceito antes de o domínio próprio ser verificado.
const DEFAULT_RESEND_FROM = 'MeuPaciente <onboarding@resend.dev>';
// Porta do SMTP com TLS desde o início (a do Gmail).
const DEFAULT_SMTP_PORT = 465;

/**
 * Escolhe o provedor pela configuração (ADR-011): SMTP, depois Resend; sem
 * nenhum dos dois, o e-mail só vai para o log.
 */
export function createEmailSender(config: ConfigService): EmailSender {
  const smtpHost = config.get<string>('SMTP_HOST');
  if (smtpHost) {
    // SMTP_USER e SMTP_PASSWORD já foram exigidos no boot (validateEnv).
    const user = config.getOrThrow<string>('SMTP_USER');
    return new SmtpEmailSender(
      {
        host: smtpHost,
        port: Number(config.get<string>('SMTP_PORT') || DEFAULT_SMTP_PORT),
        user,
        password: config.getOrThrow<string>('SMTP_PASSWORD'),
      },
      // No Gmail o endereço precisa ser o da própria conta; só o nome é livre.
      config.get<string>('EMAIL_FROM') || `MeuPaciente <${user}>`,
    );
  }

  const apiKey = config.get<string>('RESEND_API_KEY');
  if (apiKey) {
    return new ResendEmailSender(apiKey, config.get<string>('EMAIL_FROM') || DEFAULT_RESEND_FROM);
  }

  return new LogEmailSender(config.get<string>('NODE_ENV') === 'production');
}

@Module({
  providers: [
    {
      provide: EMAIL_SENDER,
      inject: [ConfigService],
      useFactory: createEmailSender,
    },
  ],
  exports: [EMAIL_SENDER],
})
export class EmailModule {}
