import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_SENDER } from './email-sender';
import { LogEmailSender } from './log-email-sender';
import { ResendEmailSender } from './resend-email-sender';

// Remetente padrão do Resend, aceito antes de o domínio próprio ser verificado.
const DEFAULT_FROM = 'MeuPaciente <onboarding@resend.dev>';

@Module({
  providers: [
    {
      provide: EMAIL_SENDER,
      inject: [ConfigService],
      // Com a chave do Resend, envia de verdade; sem ela, só registra no log.
      useFactory: (config: ConfigService) => {
        const apiKey = config.get<string>('RESEND_API_KEY');
        if (apiKey) {
          return new ResendEmailSender(apiKey, config.get<string>('EMAIL_FROM') || DEFAULT_FROM);
        }
        return new LogEmailSender(config.get<string>('NODE_ENV') === 'production');
      },
    },
  ],
  exports: [EMAIL_SENDER],
})
export class EmailModule {}
