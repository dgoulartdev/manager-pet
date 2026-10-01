import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';

/**
 * Libera a rota só para quem manda o CRON_SECRET. O Vercel Cron envia
 * "Authorization: Bearer <CRON_SECRET>" quando a variável existe no projeto.
 * Sem a variável no servidor, ninguém passa: a rota fica fechada por padrão.
 */
@Injectable()
export class CronSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>('CRON_SECRET');
    const authorization = context.switchToHttp().getRequest<Request>().headers.authorization;

    if (!secret || !authorization || !sameText(authorization, `Bearer ${secret}`)) {
      throw new UnauthorizedException('Tarefa agendada chamada sem o segredo correto.');
    }
    return true;
  }
}

// Comparação em tempo constante: a demora da resposta não revela quanto do segredo confere.
function sameText(received: string, expected: string): boolean {
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes);
}
