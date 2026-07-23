export class ContaAzulError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ContaAzulError';
  }
}

export class AuthError extends ContaAzulError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUTH_ERROR', details);
    this.name = 'AuthError';
  }
}

export class ApiError extends ContaAzulError {
  constructor(
    message: string,
    readonly status?: number,
    details?: unknown,
  ) {
    super(message, 'API_ERROR', details);
    this.name = 'ApiError';
  }
}

export function isContaAzulError(error: unknown): error is ContaAzulError {
  return error instanceof ContaAzulError;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ContaAzulError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}
