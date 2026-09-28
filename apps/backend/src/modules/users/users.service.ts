import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { Prisma } from '@prisma/client';
import type { UserDto } from '@meupaciente/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { toUserDto } from '../../common/mappers/user.mapper';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

function currentPasswordError(message: string): UnprocessableEntityException {
  return new UnprocessableEntityException({
    detail: message,
    errors: [{ field: 'current_password', message }],
  });
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return toUserDto(user);
  }

  async updateProfile(userId: string, dto: UpdateUserDto): Promise<UserDto> {
    const current = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!current) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    // Trocar o e-mail muda o acesso à conta (e o destino da recuperação de
    // senha): com o aparelho desbloqueado, não basta a sessão aberta.
    if (dto.email !== undefined && dto.email !== current.email) {
      await this.assertPassword(current.password, dto.current_password, {
        missing: 'Informe sua senha atual para trocar o e-mail.',
        wrong: 'Senha atual incorreta.',
      });
    }

    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { name: dto.name, email: dto.email },
      });
      return toUserDto(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Já existe um cadastro com este e-mail.');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Usuário não encontrado.');
        }
      }
      throw error;
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    await this.assertPassword(user.password, dto.current_password, {
      missing: 'Informe sua senha atual.',
      wrong: 'Senha atual incorreta.',
    });

    const passwordHash = await hash(dto.new_password, 10);

    // Troca a senha e revoga sessões ativas (mesmo padrão do reset-password).
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { password: passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { user_id: userId, revoked: false },
        data: { revoked: true },
      }),
    ]);
  }

  /**
   * Confere a senha atual. 422 no campo, não 401: a sessão é válida, o valor
   * informado é que está errado (um 401 faria o cliente renovar o token e
   * repetir a requisição).
   */
  private async assertPassword(
    passwordHash: string,
    informed: string | undefined,
    messages: { missing: string; wrong: string },
  ): Promise<void> {
    if (!informed) throw currentPasswordError(messages.missing);
    if (!(await compare(informed, passwordHash))) throw currentPasswordError(messages.wrong);
  }
}
