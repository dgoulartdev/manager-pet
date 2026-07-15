import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

const TITLES_BY_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
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

@Catch(HttpException)
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    const title = TITLES_BY_STATUS[status] ?? exception.name;
    let detail = exception.message;
    let errors: unknown;

    if (typeof body === 'object' && body !== null) {
      const record = body as Record<string, unknown>;
      if (typeof record.detail === 'string') detail = record.detail;
      else if (typeof record.message === 'string') detail = record.message;
      if (Array.isArray(record.errors)) errors = record.errors;
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
}
