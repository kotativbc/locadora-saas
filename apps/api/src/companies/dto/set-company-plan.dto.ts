import { IsOptional, IsUUID } from 'class-validator';

export class SetCompanyPlanDto {
  @IsOptional()
  @IsUUID()
  planId?: string; // omitido/null = sem plano (sem limite)
}
