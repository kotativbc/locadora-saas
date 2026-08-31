import { IsDateString, IsNumberString } from 'class-validator';

export class CreateCautionInstallmentDto {
  @IsDateString()
  dueDate!: string;

  @IsNumberString()
  amount!: string;
}
