import { IsNumberString } from 'class-validator';

export class MarkVehicleSoldDto {
  @IsNumberString()
  salePrice!: string;
}
