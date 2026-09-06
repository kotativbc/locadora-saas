import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InspectionsService } from '../inspections/inspections.service';
import { SubmitInspectionLinkDto } from '../inspections/dto/submit-inspection-link.dto';
import { Public } from '../auth/public.decorator';

@Controller('public/inspection')
@Public()
export class PublicInspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Get(':token')
  getByToken(@Param('token') token: string) {
    return this.inspectionsService.getByToken(token);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // barra spam de envio
  @Post(':token')
  submit(@Param('token') token: string, @Body() dto: SubmitInspectionLinkDto) {
    return this.inspectionsService.submitByToken(token, dto);
  }
}
