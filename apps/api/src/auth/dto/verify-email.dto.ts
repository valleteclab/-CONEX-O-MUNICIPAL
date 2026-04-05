import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength, IsUUID } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Token de verificação de e-mail' })
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token!: string;
}

export class SwitchTenantDto {
  @ApiProperty({ description: 'Tenant ativo para a sessão', format: 'uuid' })
  @IsUUID()
  tenantId!: string;
}
