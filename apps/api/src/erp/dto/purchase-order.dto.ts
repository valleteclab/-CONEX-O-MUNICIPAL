import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class PurchaseOrderLineDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @IsNumberString()
  qty!: string;

  @ApiProperty()
  @IsNumberString()
  unitPrice!: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsUUID()
  supplierPartyId!: string;

  @ApiProperty({ type: [PurchaseOrderLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  items!: PurchaseOrderLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class PatchPurchaseOrderStatusDto {
  @ApiProperty({ enum: ['draft', 'confirmed', 'received', 'cancelled'] })
  @IsIn(['draft', 'confirmed', 'received', 'cancelled'])
  status!: 'draft' | 'confirmed' | 'received' | 'cancelled';
}
