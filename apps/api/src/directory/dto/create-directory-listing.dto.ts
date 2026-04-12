import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class DirectoryContactInfoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  whatsapp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  instagram?: string;
}

class DirectoryOfferingDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ enum: ['product', 'service'] })
  @IsIn(['product', 'service'])
  kind!: 'product' | 'service';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  price?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;
}

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
  @MaxLength(180)
  publicHeadline?: string;

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

  @ApiPropertyOptional({ type: DirectoryContactInfoDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DirectoryContactInfoDto)
  contactInfo?: DirectoryContactInfoDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];

  @ApiPropertyOptional({ type: [DirectoryOfferingDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DirectoryOfferingDto)
  offerings?: DirectoryOfferingDto[];
}
