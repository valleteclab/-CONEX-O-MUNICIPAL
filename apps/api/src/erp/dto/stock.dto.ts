import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStockLocationDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ description: 'Se true, desmarca outros como padrão' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateStockMovementDto {
  @ApiProperty({ enum: ['in', 'out', 'adjust'] })
  @IsIn(['in', 'out', 'adjust'])
  type!: 'in' | 'out' | 'adjust';

  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @IsUUID()
  locationId!: string;

  @ApiProperty({ description: 'Sempre > 0. Em `adjust`, define saldo absoluto no local.' })
  @IsNumberString()
  quantity!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  refType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  refId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
