import { IsBoolean } from 'class-validator';

export class UpdateCautionInstallmentDto {
  @IsBoolean()
  paid!: boolean;
}
