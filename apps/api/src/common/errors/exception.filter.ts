import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AppException, ErrorCode } from './business-error';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const traceId =
      (request.headers['x-trace-id'] as string | undefined) ?? uuidv4();

    if (exception instanceof AppException) {
      const body = exception.getResponse() as {
        code: number;
        message: string;
        details?: unknown;
      };
      response.status(exception.getStatus()).json({
        code: body.code,
        message: body.message,
        details: body.details,
        traceId,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      let code: number;
      let message: string;
      let details: unknown;

      switch (status) {
        case HttpStatus.BAD_REQUEST:
          code = ErrorCode.VALIDATION_ERROR;
          message = '请求参数错误';
          if (typeof body === 'object' && body !== null) {
            const bodyObj = body as Record<string, unknown>;
            details = bodyObj['message'];
            if (typeof details === 'string') {
              message = details;
              details = undefined;
            }
          }
          break;
        case HttpStatus.UNAUTHORIZED:
          code = ErrorCode.UNAUTHORIZED;
          message = '未授权';
          break;
        case HttpStatus.FORBIDDEN:
          code = ErrorCode.FORBIDDEN;
          message = '无权限';
          break;
        case HttpStatus.NOT_FOUND:
          code = ErrorCode.NOT_FOUND;
          message = '资源不存在';
          break;
        case HttpStatus.CONFLICT:
          code = ErrorCode.CONFLICT;
          message = '资源冲突';
          break;
        case HttpStatus.TOO_MANY_REQUESTS:
          code = ErrorCode.RATE_LIMIT;
          message = '请求过于频繁';
          break;
        default:
          code = ErrorCode.INTERNAL;
          message = '服务器内部错误';
      }

      response.status(status).json({ code, message, details, traceId });
      return;
    }

    this.logger.error(
      `未捕获异常 traceId=${traceId} path=${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: ErrorCode.INTERNAL,
      message: '服务器内部错误',
      traceId,
    });
  }
}
