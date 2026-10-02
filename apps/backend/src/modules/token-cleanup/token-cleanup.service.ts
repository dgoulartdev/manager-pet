import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface TokenCleanupResult {
  refreshTokens: number;
  passwordResetTokens: number;
}

/**
 * Apaga tokens que não servem mais (ADR-006): sessões vencidas ou revogadas e
 * links de redefinição vencidos ou já usados. Nenhum deles é aceito pela API,
 * então apagar não muda comportamento — só evita que as tabelas cresçam para
 * sempre. Idempotente: rodar duas vezes ou em duas instâncias não faz mal.
 * Quem dispara é o Vercel Cron, uma vez por dia (GET /v1/cron/token-cleanup).
 */
@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  async purge(now = new Date()): Promise<TokenCleanupResult> {
    const [refresh, reset] = await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({
        where: { OR: [{ expires_at: { lt: now } }, { revoked: true }] },
      }),
      this.prisma.passwordResetToken.deleteMany({
        where: { OR: [{ expires_at: { lt: now } }, { used: true }] },
      }),
    ]);

    this.logger.log(`Tokens apagados: ${refresh.count} de sessão, ${reset.count} de redefinição.`);
    return { refreshTokens: refresh.count, passwordResetTokens: reset.count };
  }
}
