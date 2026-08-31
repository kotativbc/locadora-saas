import { IsString, MinLength } from 'class-validator';

export class DeleteCompanyDto {
  /** Precisa bater exatamente com o nome da empresa — confirmação contra clique errado. */
  @IsString()
  @MinLength(1)
  confirmName!: string;
}
