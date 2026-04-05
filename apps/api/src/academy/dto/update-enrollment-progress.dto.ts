import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateEnrollmentProgressDto {
  @ApiProperty({ minimum: 0, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent!: number;
}
