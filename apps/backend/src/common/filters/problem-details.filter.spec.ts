import { ArgumentsHost, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProblemDetailsFilter } from './problem-details.filter';

// Monta um ArgumentsHost falso e devolve o status e o corpo enviados na resposta.
function runFilter(exception: unknown): { status: number; body: Record<string, unknown> } {
  const result = { status: 0, body: {} as Record<string, unknown> };
  const response = {
    status(code: number) {
      result.status = code;
      return this;
    },
    type() {
      return this;
    },
    json(body: Record<string, unknown>) {
      result.body = body;
      return this;
    },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ method: 'DELETE', originalUrl: '/v1/tutors/x' }),
    }),
  } as unknown as ArgumentsHost;

  new ProblemDetailsFilter().catch(exception, host);
  return result;
}

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('erro', {
    code,
    clientVersion: 'test',
  });
}

describe('ProblemDetailsFilter', () => {
  it('converte HttpException no formato RFC 7807', () => {
    const { status, body } = runFilter(new NotFoundException('Tutor não encontrado.'));
    expect(status).toBe(404);
    expect(body).toMatchObject({
      type: 'https://meupaciente.com.br/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: 'Tutor não encontrado.',
      instance: '/v1/tutors/x',
    });
  });

  it.each([
    ['P2002', 409],
    ['P2003', 409],
    ['P2025', 404],
  ])('mapeia o erro Prisma %s para %i', (code, expected) => {
    expect(runFilter(prismaError(code)).status).toBe(expected);
  });

  it('erros desconhecidos viram 500 sem expor a causa', () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { status, body } = runFilter(new Error('detalhe interno'));
    expect(status).toBe(500);
    expect(body.detail).toBe('Erro interno do servidor.');
  });
});
