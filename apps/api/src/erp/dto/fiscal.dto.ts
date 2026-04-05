import { IsIn, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmitFiscalDto {
  @ApiProperty({ description: 'ID do pedido de venda confirmado' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ enum: ['nfse', 'nfe'], description: 'Tipo de nota fiscal' })
  @IsIn(['nfse', 'nfe'])
  type: 'nfse' | 'nfe';
}
