import { HttpException, HttpStatus } from '@nestjs/common';

export enum ErrorCode {
  VALIDATION_ERROR = 10001,
  UNAUTHORIZED = 10002,
  FORBIDDEN = 10003,
  NOT_FOUND = 10004,
  CONFLICT = 10005,
  RATE_LIMIT = 10006,
  INTERNAL = 10007,
  CATEGORY_HAS_BILLS = 10008,
  TAG_HAS_BILLS = 10009,
}

export interface AppErrorResponse {
  code: number;
  message: string;
  details?: unknown;
  traceId?: string;
}

export class AppException extends HttpException {
  public readonly code: number;
  public readonly details?: unknown;
  public readonly traceId?: string;

  constructor(
    code: ErrorCode,
    message: string,
    details?: unknown,
    traceId?: string,
  ) {
    const httpStatus = AppException.codeToHttpStatus(code);
    super({ code, message, details, traceId }, httpStatus);
    this.code = code;
    this.details = details;
    this.traceId = traceId;
  }

  private static codeToHttpStatus(code: ErrorCode): HttpStatus {
    switch (code) {
      case ErrorCode.VALIDATION_ERROR:
        return HttpStatus.BAD_REQUEST;
      case ErrorCode.UNAUTHORIZED:
        return HttpStatus.UNAUTHORIZED;
      case ErrorCode.FORBIDDEN:
        return HttpStatus.FORBIDDEN;
      case ErrorCode.NOT_FOUND:
        return HttpStatus.NOT_FOUND;
      case ErrorCode.CONFLICT:
      case ErrorCode.CATEGORY_HAS_BILLS:
      case ErrorCode.TAG_HAS_BILLS:
        return HttpStatus.CONFLICT;
      case ErrorCode.RATE_LIMIT:
        return HttpStatus.TOO_MANY_REQUESTS;
      case ErrorCode.INTERNAL:
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }
}

export class ValidationException extends AppException {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.VALIDATION_ERROR, message, details);
  }
}

export class UnauthorizedException extends AppException {
  constructor(message = '未授权') {
    super(ErrorCode.UNAUTHORIZED, message);
  }
}

export class ForbiddenException extends AppException {
  constructor(message = '无权限') {
    super(ErrorCode.FORBIDDEN, message);
  }
}

export class NotFoundException extends AppException {
  constructor(message = '资源不存在') {
    super(ErrorCode.NOT_FOUND, message);
  }
}

export class ConflictException extends AppException {
  constructor(message: string) {
    super(ErrorCode.CONFLICT, message);
  }
}

export class RateLimitException extends AppException {
  constructor(message = '请求过于频繁') {
    super(ErrorCode.RATE_LIMIT, message);
  }
}

export class InternalException extends AppException {
  constructor(message = '服务器内部错误') {
    super(ErrorCode.INTERNAL, message);
  }
}
