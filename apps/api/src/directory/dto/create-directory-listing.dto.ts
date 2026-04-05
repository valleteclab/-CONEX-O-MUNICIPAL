import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateDirectoryListingDto {
  @ApiProperty({ example: 'padaria-central' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug: apenas minúsculas, números e hífens',
  })
  slug!: string;

  @ApiProperty({ example: 'Comércio Exemplo Ltda' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  tradeName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;

  @ApiPropertyOptional({ example: 'Alimentação' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiProperty({ enum: ['perfil', 'loja'] })
  @IsIn(['perfil', 'loja'])
  modo!: 'perfil' | 'loja';
}
