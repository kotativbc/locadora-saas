import { Module } from '@nestjs/common';
import { DamagesService } from './damages.service';
import { DamagesController } from './damages.controller';

@Module({
  controllers: [DamagesController],
  providers: [DamagesService],
})
export class DamagesModule {}
