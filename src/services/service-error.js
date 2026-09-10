export class ServiceError extends Error {
  constructor(userMessage, cause) {
    super(userMessage);
    this.name = 'ServiceError';
    this.userMessage = userMessage;
    this.cause = cause;
  }
}

export function toUserMessage(error) {
  if (error instanceof ServiceError) {
    return error.userMessage;
  }

  return 'Không thể xử lý yêu cầu lúc này. Vui lòng thử lại sau.';
}
