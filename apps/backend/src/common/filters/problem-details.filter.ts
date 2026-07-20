import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

const TITLES_BY_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'Payload Too Large',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Validation Error',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
};

function slug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

interface ResolvedError {
  status: number;
  detail: string;
  errors?: unknown;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, detail, errors } = this.resolve(exception);
    const title = TITLES_BY_STATUS[status] ?? 'Error';

    // Erros 5xx: registra a causa real no servidor sem expor ao cliente.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.originalUrl}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response
      .status(status)
      .type('application/problem+json')
      .json({
        type: `https://gerenciamentofelinos.com.br/errors/${slug(title)}`,
        title,
        status,
        detail,
        instance: request.originalUrl,
        ...(errors ? { errors } : {}),
      });
  }

  private resolve(exception: unknown): ResolvedError {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      let detail = exception.message;
      let errors: unknown;

      if (typeof body === 'object' && body !== null) {
        const record = body as Record<string, unknown>;
        if (typeof record.detail === 'string') detail = record.detail;
        else if (typeof record.message === 'string') detail = record.message;
        if (Array.isArray(record.errors)) errors = record.errors;
      }

      return { status, detail, errors };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          status: HttpStatus.CONFLICT,
          detail: 'Já existe um registro com esse valor único.',
        };
      }
      if (exception.code === 'P2025') {
        return {
          status: HttpStatus.NOT_FOUND,
          detail: 'O recurso solicitado não foi encontrado.',
        };
      }
    }

    // Erros do multer (upload) não são HttpException. Mapeados aqui por nome
    // para não virarem 500 genérico. @types/multer não é instalado no projeto.
    if (exception instanceof Error && exception.name === 'MulterError') {
      const code = (exception as { code?: string }).code;
      if (code === 'LIMIT_FILE_SIZE') {
        return {
          status: HttpStatus.PAYLOAD_TOO_LARGE,
          detail: 'Imagem excede o tamanho máximo de 5MB.',
        };
      }
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        detail: 'Falha no upload do arquivo.',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'Erro interno do servidor.',
    };
  }
}
