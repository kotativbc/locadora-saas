import { IsIn, IsOptional } from 'class-validator';

export class UpdateFineDto {
  @IsOptional()
  @IsIn(['pending', 'paid', 'contested'])
  status?: 'pending' | 'paid' | 'contested';
}
