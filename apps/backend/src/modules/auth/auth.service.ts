import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Prisma, User } from '@prisma/client';
import type { StringValue } from 'ms';
import type { AuthResponse } from '@meupaciente/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { toUserDto } from '../../common/mappers/user.mapper';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EMAIL_SENDER, EmailSender } from '../email/email-sender';
import { passwordResetEmail } from '../email/password-reset-email';

const PASSWORD_RESET_TTL_MINUTES = 60;
const PASSWORD_RESET_TTL_MS = PASSWORD_RESET_TTL_MINUTES * 60 * 1000;
// Endereço do app (frontend) que abre o formulário de senha nova.
const DEFAULT_APP_URL = 'http://localhost:5173';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Antes do 409: quem está fora da lista não descobre quais e-mails já têm conta.
    if (!this.isSignupAllowed(dto.email)) {
      throw new ForbiddenException('Este e-mail não está autorizado a criar conta.');
    }

    const passwordHash = await hash(dto.password, 10);

    let user: User;
    try {
      user = await this.prisma.user.create({
        data: { name: dto.name, email: dto.email, password: passwordHash },
      });
    } catch (error) {
      // P2002 = violação de unique (email). Trata a corrida sem pré-check TOCTOU.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Já existe um cadastro com este e-mail.');
      }
      throw error;
    }

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

    const appUrl = (this.configService.get<string>('APP_URL') || DEFAULT_APP_URL).replace(/\/$/, '');
    const message = passwordResetEmail({
      to: user.email,
      name: user.name,
      link: `${appUrl}/redefinir-senha?token=${rawToken}`,
      validForMinutes: PASSWORD_RESET_TTL_MINUTES,
    });

    // Sem await: a resposta leva o mesmo tempo com e sem conta (não revela quem
    // está cadastrado). Falha do provedor fica no log; a pessoa pode pedir de novo.
    void this.emailSender.send(message).catch((error: unknown) => {
      this.logger.error(`Falha ao enviar o e-mail de recuperação de senha: ${String(error)}`);
    });
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
      user: toUserDto(user),
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Cadastro restrito (ADR-010): com SIGNUP_ALLOWED_EMAILS definida, só os e-mails
   * da lista criam conta. Sem a variável, o cadastro fica aberto (dev e testes).
   * O e-mail do DTO já chega aparado e em minúsculas (@NormalizeEmail).
   */
  private isSignupAllowed(email: string): boolean {
    const allowedEmails = this.configService.get<string>('SIGNUP_ALLOWED_EMAILS')?.trim();
    if (!allowedEmails) return true;

    return allowedEmails
      .split(',')
      .map((allowed) => allowed.trim().toLowerCase())
      .includes(email);
  }
}
