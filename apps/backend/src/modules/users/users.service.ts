import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { Prisma } from '@prisma/client';
import type { UserDto } from '@felino/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { toUserDto } from '../../common/mappers/user.mapper';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

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

    const valid = await compare(dto.current_password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Senha atual incorreta.');
    }

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
}
