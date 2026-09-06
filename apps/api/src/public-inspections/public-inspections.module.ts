import { Module } from '@nestjs/common';
import { PublicInspectionsController } from './public-inspections.controller';
import { InspectionsModule } from '../inspections/inspections.module';

@Module({
  imports: [InspectionsModule],
  controllers: [PublicInspectionsController],
})
export class PublicInspectionsModule {}
