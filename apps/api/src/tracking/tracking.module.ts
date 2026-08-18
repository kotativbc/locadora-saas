import { Module } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { TrackingController } from './tracking.controller';
import { ManualTrackingAdapter } from './manual-tracking.adapter';
import { TRACKING_ADAPTER } from './tracking-adapter.interface';

@Module({
  controllers: [TrackingController],
  providers: [
    TrackingService,
    ManualTrackingAdapter,
    // Ponto único de troca: pra plugar um rastreador real no futuro, basta
    // trocar esse provider por outra classe que implemente TrackingAdapter.
    { provide: TRACKING_ADAPTER, useExisting: ManualTrackingAdapter },
  ],
})
export class TrackingModule {}
