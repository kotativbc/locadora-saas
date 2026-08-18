import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';

export class UpdateClaimDto {
  @IsOptional()
  @IsIn(['open', 'in_progress', 'resolved', 'closed'])
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';

  @IsOptional()
  @IsString()
  insuranceClaimNumber?: string;

  @IsOptional()
  @IsNumberString()
  estimatedCost?: string;
}
