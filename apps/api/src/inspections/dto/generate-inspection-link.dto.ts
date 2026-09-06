import { IsIn } from 'class-validator';

export class GenerateInspectionLinkDto {
  @IsIn(['delivery', 'return'])
  type!: 'delivery' | 'return';
}
