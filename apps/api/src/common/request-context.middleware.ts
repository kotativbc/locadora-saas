import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from './request-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly context: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    this.context.run(
      {
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
        method: req.method,
        path: req.originalUrl,
      },
      next,
    );
  }
}
