import { UnprocessableEntityException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

function flatten(errors: ValidationError[], parentPath = ''): { field: string; message: string }[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const messages = error.constraints ? Object.values(error.constraints) : [];
    const ownErrors = messages.map((message) => ({ field, message }));
    const childErrors = error.children?.length ? flatten(error.children, field) : [];
    return [...ownErrors, ...childErrors];
  });
}

export function validationExceptionFactory(errors: ValidationError[]): UnprocessableEntityException {
  return new UnprocessableEntityException({
    detail: 'Um ou mais campos estão inválidos.',
    errors: flatten(errors),
  });
}
