import { Controller, Get, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { CronSecretGuard } from './cron-secret.guard';
import { TokenCleanupService } from './token-cleanup.service';

interface TokenCleanupResponse {
  refresh_tokens: number;
  password_reset_tokens: number;
}

// Rotas chamadas pelo Vercel Cron (agenda em apps/backend/vercel.json). Sem JWT:
// quem chama é a plataforma, e o CRON_SECRET faz o papel da autenticação.
@Public()
@UseGuards(CronSecretGuard)
@Controller('cron')
export class TokenCleanupController {
  constructor(private readonly tokenCleanup: TokenCleanupService) {}

  // GET porque é o método que o Vercel Cron usa.
  @Get('token-cleanup')
  async cleanup(): Promise<TokenCleanupResponse> {
    const result = await this.tokenCleanup.purge();
    return {
      refresh_tokens: result.refreshTokens,
      password_reset_tokens: result.passwordResetTokens,
    };
  }
}
