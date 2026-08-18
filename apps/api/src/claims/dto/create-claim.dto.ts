import { IsBoolean, IsDateString, IsIn, IsNumberString, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateClaimDto {
  @IsUUID()
  vehicleId!: string;

  @IsOptional()
  @IsUUID()
  contractId?: string;

  @IsIn(['accident', 'theft', 'fire', 'other'])
  type!: 'accident' | 'theft' | 'fire' | 'other';

  @IsDateString()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsString()
  @MinLength(3)
  description!: string;

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
}
