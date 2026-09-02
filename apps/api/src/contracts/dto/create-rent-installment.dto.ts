import { IsDateString, IsNumberString } from 'class-validator';

export class CreateRentInstallmentDto {
  @IsDateString()
  dueDate!: string;

  @IsNumberString()
  amount!: string;
}
