import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAccountReceivableDto {
  @ApiProperty()
  @IsUUID()
  partyId!: string;

  @ApiProperty({ example: '2026-04-30' })
  @IsDateString()
  dueDate!: string;

  @ApiProperty()
  @IsNumberString()
  amount!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  linkId?: string;
}

export class PatchFinanceStatusDto {
  @ApiProperty({ enum: ['open', 'paid', 'cancelled'] })
  @IsIn(['open', 'paid', 'cancelled'])
  status!: 'open' | 'paid' | 'cancelled';
}

export class CreateAccountPayableDto {
  @ApiProperty()
  @IsUUID()
  partyId!: string;

  @ApiProperty()
  @IsDateString()
  dueDate!: string;

  @ApiProperty()
  @IsNumberString()
  amount!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  linkId?: string;
}

export class CreateCashEntryDto {
  @ApiProperty({ enum: ['in', 'out'] })
  @IsIn(['in', 'out'])
  type!: 'in' | 'out';

  @ApiProperty()
  @IsNumberString()
  amount!: string;

  @ApiProperty()
  @IsString()
  category!: string;

  @ApiProperty({ description: 'ISO datetime' })
  @IsDateString()
  occurredAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
