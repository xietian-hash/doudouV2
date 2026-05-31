import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface RequestUser {
  id?: string | bigint;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const traceId =
      (request.headers['x-trace-id'] as string | undefined) ?? uuidv4();
    const start = Date.now();
    const { method, url } = request;
    const user = request.user as RequestUser | undefined;
    const userId = user?.id?.toString() ?? 'anonymous';

    return next.handle().pipe(
      tap({
        next: () => {
          const costMs = Date.now() - start;
          this.logger.log(
            `traceId=${traceId} userId=${userId} method=${method} path=${url} status=${response.statusCode} costMs=${costMs}`,
          );
        },
        error: (err: unknown) => {
          const costMs = Date.now() - start;
          const status =
            err instanceof Error && 'getStatus' in err
              ? (err as { getStatus: () => number }).getStatus()
              : 500;
          this.logger.warn(
            `traceId=${traceId} userId=${userId} method=${method} path=${url} status=${status} costMs=${costMs}`,
          );
        },
      }),
    );
  }
}
