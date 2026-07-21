import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcryptjs');

const mockedHash = hash as unknown as jest.Mock;
const mockedCompare = compare as unknown as jest.Mock;

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    name: 'Ana',
    email: 'ana@example.com',
    password: 'hashed-password',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as User;
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: Record<string, jest.Mock>;
    refreshToken: Record<string, jest.Mock>;
    passwordResetToken: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };
  let jwtService: Record<string, jest.Mock>;
  let configService: Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      user: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      passwordResetToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      verifyAsync: jest.fn(),
      decode: jest
        .fn()
        .mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    };

    configService = {
      getOrThrow: jest.fn((key: string) => `secret-${key}`),
      get: jest.fn((_key: string, def?: string) => def),
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  describe('register', () => {
    it('cria o usuário e devolve tokens', async () => {
      mockedHash.mockResolvedValue('hashed-password');
      const user = buildUser();
      prisma.user.create.mockResolvedValue(user);

      const result = await service.register({
        name: 'Ana',
        email: 'ana@example.com',
        password: 'senha123',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { name: 'Ana', email: 'ana@example.com', password: 'hashed-password' },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalled();
      expect(result.access_token).toBe('signed-token');
      expect(result.refresh_token).toBe('signed-token');
      expect(result.user.email).toBe('ana@example.com');
    });

    it('lança ConflictException se o e-mail já existe (P2002)', async () => {
      mockedHash.mockResolvedValue('hashed-password');
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: '6.19.3',
        }),
      );

      await expect(
        service.register({
          name: 'Ana',
          email: 'ana@example.com',
          password: 'senha123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('autentica e devolve tokens quando a senha confere', async () => {
      const user = buildUser();
      prisma.user.findUnique.mockResolvedValue(user);
      mockedCompare.mockResolvedValue(true);

      const result = await service.login({
        email: 'ana@example.com',
        password: 'senha123',
      });

      expect(result.access_token).toBe('signed-token');
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('lança UnauthorizedException se o usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nao-existe@example.com', password: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('lança UnauthorizedException se a senha não confere', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());
      mockedCompare.mockResolvedValue(false);

      await expect(
        service.login({ email: 'ana@example.com', password: 'errada' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('rotaciona o refresh token válido', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        revoked: false,
        expires_at: new Date(Date.now() + 60_000),
      });
      prisma.user.findUnique.mockResolvedValue(buildUser());

      const result = await service.refresh('old-refresh-token');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { revoked: true },
      });
      expect(result.access_token).toBe('signed-token');
    });

    it('lança UnauthorizedException se a assinatura JWT for inválida', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('bad signature'));

      await expect(service.refresh('token-invalido')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('lança UnauthorizedException se o token estiver revogado', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        revoked: true,
        expires_at: new Date(Date.now() + 60_000),
      });

      await expect(service.refresh('token-revogado')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('lança UnauthorizedException se o token estiver expirado', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        revoked: false,
        expires_at: new Date(Date.now() - 60_000),
      });

      await expect(service.refresh('token-expirado')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('lança UnauthorizedException se o usuário do payload não existe mais', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        revoked: false,
        expires_at: new Date(Date.now() + 60_000),
      });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh('token-orfao')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('revoga todos os refresh tokens ativos do usuário', async () => {
      await service.logout('user-1');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { user_id: 'user-1', revoked: false },
        data: { revoked: true },
      });
    });
  });

  describe('forgotPassword', () => {
    it('cria token de reset quando o e-mail existe', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());

      await service.forgotPassword('ana@example.com');

      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
    });

    it('não cria token nem erra quando o e-mail não existe (evita enumeração)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.forgotPassword('fantasma@example.com'),
      ).resolves.toBeUndefined();
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('atualiza a senha e marca o token como usado', async () => {
      mockedHash.mockResolvedValue('nova-hash');
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-1',
        user_id: 'user-1',
        used: false,
        expires_at: new Date(Date.now() + 60_000),
      });

      await service.resetPassword({
        token: 'token-valido',
        new_password: 'nova-senha1',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('lança UnauthorizedException se o token não existe', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'inexistente', new_password: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('lança UnauthorizedException se o token já foi usado', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-1',
        user_id: 'user-1',
        used: true,
        expires_at: new Date(Date.now() + 60_000),
      });

      await expect(
        service.resetPassword({ token: 'usado', new_password: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('lança UnauthorizedException se o token está expirado', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-1',
        user_id: 'user-1',
        used: false,
        expires_at: new Date(Date.now() - 60_000),
      });

      await expect(
        service.resetPassword({ token: 'expirado', new_password: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
