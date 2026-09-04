import { IsDateString, IsIn, IsNumberString, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateFineDto {
  @IsOptional()
  @IsDateString()
  infractionDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumberString()
  amount?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  description?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsIn(['pending', 'paid', 'contested'])
  status?: 'pending' | 'paid' | 'contested';
}
