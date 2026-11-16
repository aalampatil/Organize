export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code = 'REQUEST_FAILED',
  ) {
    super(message);
    this.name = 'AppError';
  }
}
export const notFound = () => new AppError(404, 'This item could not be found.', 'NOT_FOUND');
