import { IsArray, IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

const FUEL_LEVELS = ['cheio', '3/4', '1/2', '1/4', 'reserva'] as const;

export class SubmitInspectionLinkDto {
  @IsInt()
  @Min(0)
  odometerKm!: number;

  @IsIn(FUEL_LEVELS)
  fuelLevel!: (typeof FUEL_LEVELS)[number];

  @IsOptional()
  @IsString()
  exteriorNotes?: string;

  @IsOptional()
  @IsArray()
  checklistItems?: { category: string; item: string; checked: boolean; note?: string }[];

  @IsString()
  @MinLength(2, { message: 'Informe o nome de quem está assinando.' })
  signerName!: string;

  // PNG em base64 (data URL) capturado do campo de assinatura desenhada.
  @IsString()
  @MinLength(100, { message: 'Assinatura não capturada — desenhe antes de enviar.' })
  signatureImage!: string;
}
