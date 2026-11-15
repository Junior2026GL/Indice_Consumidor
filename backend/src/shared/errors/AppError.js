export class AppError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.expose = true; // el mensaje es seguro de mostrar al cliente
  }
}

export const badRequest = (message, details) => new AppError(message, 400, details);
export const unauthorized = (message = 'No autenticado') => new AppError(message, 401);
export const forbidden = (message = 'No tienes permisos para esta acción') => new AppError(message, 403);
export const notFoundError = (message = 'Recurso no encontrado') => new AppError(message, 404);
export const conflict = (message) => new AppError(message, 409);
