import { HTTPException } from 'hono/http-exception';

export class AppError extends HTTPException {
  constructor(
    status: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(status as any, { message });
  }
}

export function notFound(message = 'Not found') {
  return new AppError(404, message);
}

export function unauthorized(message = 'Unauthorized') {
  return new AppError(401, message);
}

export function forbidden(message = 'Forbidden') {
  return new AppError(403, message);
}

export function badRequest(message: string, details?: Record<string, unknown>) {
  return new AppError(400, message, details);
}
