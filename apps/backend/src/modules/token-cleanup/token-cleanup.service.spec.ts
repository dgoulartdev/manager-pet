import { PrismaService } from '../../prisma/prisma.service';
import { TokenCleanupService } from './token-cleanup.service';

describe('TokenCleanupService', () => {
  let service: TokenCleanupService;
  let prisma: {
    refreshToken: { deleteMany: jest.Mock };
    passwordResetToken: { deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      refreshToken: { deleteMany: jest.fn().mockResolvedValue({ count: 3 }) },
      passwordResetToken: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    service = new TokenCleanupService(prisma as unknown as PrismaService);
  });

  it('apaga sessões vencidas ou revogadas e links vencidos ou usados', async () => {
    const now = new Date('2026-09-29T03:00:00.000Z');

    const result = await service.purge(now);

    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ expires_at: { lt: now } }, { revoked: true }] },
    });
    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ expires_at: { lt: now } }, { used: true }] },
    });
    expect(result).toEqual({ refreshTokens: 3, passwordResetTokens: 1 });
  });
});
