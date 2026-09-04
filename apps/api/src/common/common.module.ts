import { Global, Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { RequestContextService } from './request-context.service';

@Global()
@Module({
  providers: [AuditLogService, RequestContextService],
  exports: [AuditLogService, RequestContextService],
})
export class CommonModule {}
