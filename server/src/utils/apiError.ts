class ApiError extends Error {
  response: { status: number };

  constructor(message: string, statusCode: number) {
    super(message);
    this.response = { status: statusCode };
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
    this.name = 'ApiError';
  }
}

export default ApiError;