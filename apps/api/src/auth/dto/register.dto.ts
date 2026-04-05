import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Maria Souza' })
  @IsString()
  @MinLength(3)
  fullName: string;

  @ApiProperty({ example: 'maria@email.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '(77) 98888-7777' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ minLength: 8, description: 'Mín. 8 caracteres, 1 maiúscula e 1 número' })
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'Senha deve conter ao menos uma letra maiúscula' })
  @Matches(/[0-9]/, { message: 'Senha deve conter ao menos um número' })
  password: string;

  @ApiProperty({ enum: ['citizen', 'mei', 'company'] })
  @IsIn(['citizen', 'mei', 'company'])
  role: 'citizen' | 'mei' | 'company';

  @ApiProperty({ description: 'Aceite dos termos e LGPD' })
  @IsBoolean()
  acceptTerms: boolean;
}
