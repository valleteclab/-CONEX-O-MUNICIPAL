import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateLiveSessionDto {
  @ApiProperty({ example: 'luis-eduardo-magalhaes' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tenantSlug!: string;

  @ApiPropertyOptional({ description: 'Curso opcionalmente associado' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  summary?: string;

  @ApiProperty({ example: '2026-06-01T19:00:00.000Z' })
  @IsString()
  @IsNotEmpty()
  startsAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endsAt?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  meetingUrl!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublished?: boolean;
}
