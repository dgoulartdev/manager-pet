import { ConfigService } from '@nestjs/config';
import { createEmailSender } from './email.module';
import { LogEmailSender } from './log-email-sender';
import { ResendEmailSender } from './resend-email-sender';
import { SmtpEmailSender } from './smtp-email-sender';

function configWith(values: Record<string, string>): ConfigService {
  return {
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
      if (values[key] === undefined) throw new Error(`${key} ausente`);
      return values[key];
    },
  } as unknown as ConfigService;
}

const smtp = {
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_USER: 'app@gmail.com',
  SMTP_PASSWORD: 'senha-de-app',
};

describe('createEmailSender', () => {
  it('usa SMTP quando SMTP_HOST está definido, mesmo com a chave do Resend', () => {
    const sender = createEmailSender(configWith({ ...smtp, RESEND_API_KEY: 're_teste' }));

    expect(sender).toBeInstanceOf(SmtpEmailSender);
  });

  it('usa o Resend quando só a chave dele está definida', () => {
    const sender = createEmailSender(configWith({ RESEND_API_KEY: 're_teste' }));

    expect(sender).toBeInstanceOf(ResendEmailSender);
  });

  it('sem nenhum provedor, só registra o e-mail no log', () => {
    const sender = createEmailSender(configWith({}));

    expect(sender).toBeInstanceOf(LogEmailSender);
  });
});
