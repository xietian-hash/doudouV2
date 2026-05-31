import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  traceId: string;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const traceId =
      (request.headers['x-trace-id'] as string | undefined) ?? uuidv4();

    return next.handle().pipe(
      map((data: T) => ({
        code: 0,
        message: 'ok',
        data,
        traceId,
      })),
    );
  }
}
