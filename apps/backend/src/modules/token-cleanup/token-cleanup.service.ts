import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

export interface TokenCleanupResult {
  refreshTokens: number;
  passwordResetTokens: number;
}

/**
 * Apaga tokens que não servem mais (ADR-006): sessões vencidas ou revogadas e
 * links de redefinição vencidos ou já usados. Nenhum deles é aceito pela API,
 * então apagar não muda comportamento — só evita que as tabelas cresçam para
 * sempre. Idempotente: rodar em duas instâncias ao mesmo tempo não faz mal.
 */
@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Uma vez por dia, de madrugada no horário de Brasília (pouco uso).
  @Cron('0 3 * * *', { name: 'limpeza-de-tokens', timeZone: 'America/Sao_Paulo' })
  async runScheduled(): Promise<void> {
    try {
      const result = await this.purge();
      this.logger.log(
        `Tokens apagados: ${result.refreshTokens} de sessão, ${result.passwordResetTokens} de redefinição.`,
      );
    } catch (error) {
      // Falha aqui não pode derrubar o processo; a próxima execução tenta de novo.
      this.logger.error(`Falha na limpeza de tokens: ${String(error)}`);
    }
  }

  async purge(now = new Date()): Promise<TokenCleanupResult> {
    const [refresh, reset] = await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({
        where: { OR: [{ expires_at: { lt: now } }, { revoked: true }] },
      }),
      this.prisma.passwordResetToken.deleteMany({
        where: { OR: [{ expires_at: { lt: now } }, { used: true }] },
      }),
    ]);
    return { refreshTokens: refresh.count, passwordResetTokens: reset.count };
  }
}
