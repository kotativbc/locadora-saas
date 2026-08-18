import { IsLatitude, IsLongitude, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class RecordPositionDto {
  @IsUUID()
  vehicleId!: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  locationText?: string;
}
