import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CronSecretGuard } from './cron-secret.guard';

function guardWith(secret: string | undefined): CronSecretGuard {
  return new CronSecretGuard({ get: () => secret } as unknown as ConfigService);
}

function requestWith(authorization?: string): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }),
  } as unknown as ExecutionContext;
}

describe('CronSecretGuard', () => {
  it('libera quem manda o segredo no formato do Vercel Cron', () => {
    expect(guardWith('segredo-do-cron').canActivate(requestWith('Bearer segredo-do-cron'))).toBe(true);
  });

  it('recusa segredo errado', () => {
    expect(() => guardWith('segredo-do-cron').canActivate(requestWith('Bearer outro'))).toThrow(
      UnauthorizedException,
    );
  });

  it('recusa chamada sem o cabeçalho Authorization', () => {
    expect(() => guardWith('segredo-do-cron').canActivate(requestWith())).toThrow(UnauthorizedException);
  });

  it('sem CRON_SECRET no servidor, recusa todo mundo', () => {
    expect(() => guardWith(undefined).canActivate(requestWith('Bearer undefined'))).toThrow(
      UnauthorizedException,
    );
    expect(() => guardWith('').canActivate(requestWith('Bearer '))).toThrow(UnauthorizedException);
  });
});
