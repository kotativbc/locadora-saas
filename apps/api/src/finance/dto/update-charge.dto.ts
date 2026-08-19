import { IsIn, IsOptional } from 'class-validator';

export class UpdateChargeDto {
  @IsOptional()
  @IsIn(['pending', 'paid', 'cancelled'])
  status?: 'pending' | 'paid' | 'cancelled';
}
