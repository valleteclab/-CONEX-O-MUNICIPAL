import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class AdminModerationActionDto {
  @ApiProperty({
    enum: ['approve', 'reject', 'suspend', 'publish', 'activate'],
    description:
      'Diretório: approve/reject/suspend/publish. ERP: approve/reject/suspend/activate.',
  })
  @IsIn(['approve', 'reject', 'suspend', 'publish', 'activate'])
  action!: 'approve' | 'reject' | 'suspend' | 'publish' | 'activate';
}
