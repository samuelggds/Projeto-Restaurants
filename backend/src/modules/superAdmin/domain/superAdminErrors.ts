export class SuperAdminError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
    readonly code = 'SUPER_ADMIN_ERROR',
  ) {
    super(message);
    this.name = 'SuperAdminError';
  }
}

export function notFound(message: string) {
  return new SuperAdminError(message, 404, 'NOT_FOUND');
}

export function conflict(message: string) {
  return new SuperAdminError(message, 409, 'VERSION_CONFLICT');
}

