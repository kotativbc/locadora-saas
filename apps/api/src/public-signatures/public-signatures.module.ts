import { Module } from '@nestjs/common';
import { PublicSignaturesService } from './public-signatures.service';
import { PublicSignaturesController } from './public-signatures.controller';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [ContractsModule],
  controllers: [PublicSignaturesController],
  providers: [PublicSignaturesService],
})
export class PublicSignaturesModule {}
