import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PublicMaintenanceReportsService } from './public-maintenance-reports.service';
import { SubmitMaintenanceReportDto } from './dto/submit-maintenance-report.dto';
import { Public } from '../auth/public.decorator';

@Controller('public/maintenance-report')
@Public()
export class PublicMaintenanceReportsController {
  constructor(private readonly service: PublicMaintenanceReportsService) {}

  @Get(':token')
  getPreview(@Param('token') token: string) {
    return this.service.getPreview(token);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // barra spam de envio
  @Post(':token')
  submit(@Param('token') token: string, @Body() dto: SubmitMaintenanceReportDto) {
    return this.service.submitReport(token, dto.description);
  }
}
