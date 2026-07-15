import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { User } from '@prisma/client';
import type { StringValue } from 'ms';
import type { AuthResponse, UserDto } from '@felino/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hora

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Já existe um cadastro com este e-mail.');
    }

    const passwordHash = await hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, password: passwordHash },
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await compare(dto.password, user.password))) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { token_hash: tokenHash } });
    if (!stored || stored.revoked || stored.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { user_id: userId, revoked: false },
      data: { revoked: true },
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const rawToken = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        user_id: user.id,
        token_hash: this.hashToken(rawToken),
        expires_at: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });

    // MVP: sem provedor de e-mail configurado ainda. Log local para uso manual em dev.
    console.log(`[auth] Link de recuperação de senha para ${email}: token=${rawToken}`);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = this.hashToken(dto.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({ where: { token_hash: tokenHash } });

    if (!resetToken || resetToken.used || resetToken.expires_at < new Date()) {
      throw new UnauthorizedException('Token de recuperação inválido ou expirado.');
    }

    const passwordHash = await hash(dto.new_password, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.user_id },
        data: { password: passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
      this.prisma.refreshToken.updateMany({
        where: { user_id: resetToken.user_id, revoked: false },
        data: { revoked: true },
      }),
    ]);
  }

  private async issueTokens(user: User): Promise<AuthResponse> {
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<StringValue>('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, jti: randomUUID() },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<StringValue>('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    const { exp } = this.jwtService.decode<{ exp: number }>(refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: this.hashToken(refreshToken),
        expires_at: new Date(exp * 1000),
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: this.toUserDto(user),
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toUserDto(user: User): UserDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
    };
  }
}
