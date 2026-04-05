import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePlatformCourseDto {
  @ApiProperty({ example: 'luis-eduardo-magalhaes', description: 'Slug do tenant (município)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tenantSlug!: string;

  @ApiProperty({ example: 'Gestão financeira para MEI' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  summary?: string;

  @ApiPropertyOptional({ example: 'Gestão' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({
    description: 'Slug na URL; se omitido, gera-se a partir do título',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @ApiPropertyOptional({
    description:
      'URL do YouTube (watch, shorts ou youtu.be). Se incluir list=PL… (playlist), importa-se a trilha inteira como aulas; caso contrário, uma única aula.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  firstLessonYoutubeUrl?: string;

  @ApiPropertyOptional({
    description:
      'Título da primeira aula (só quando a URL é um único vídeo, sem playlist)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  firstLessonTitle?: string;
}
