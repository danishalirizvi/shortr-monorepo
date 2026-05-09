class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational = true;

  constructor(message: string, statusCode: number, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
