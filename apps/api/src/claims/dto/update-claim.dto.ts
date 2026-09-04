import { IsBoolean, IsDateString, IsIn, IsNumberString, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateClaimDto {
  @IsOptional()
  @IsIn(['accident', 'theft', 'fire', 'other'])
  type?: 'accident' | 'theft' | 'fire' | 'other';

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  description?: string;

  @IsOptional()
  @IsString()
  policeReportNumber?: string;

  @IsOptional()
  @IsBoolean()
  thirdPartyInvolved?: boolean;

  @IsOptional()
  @IsString()
  thirdPartyDescription?: string;

  @IsOptional()
  @IsString()
  insuranceClaimNumber?: string;

  @IsOptional()
  @IsNumberString()
  estimatedCost?: string;

  @IsOptional()
  @IsIn(['open', 'in_progress', 'resolved', 'closed'])
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
}
