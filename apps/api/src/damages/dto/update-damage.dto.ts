import { IsIn, IsOptional } from 'class-validator';

export class UpdateDamageDto {
  @IsOptional()
  @IsIn(['open', 'resolved'])
  status?: 'open' | 'resolved';
}
