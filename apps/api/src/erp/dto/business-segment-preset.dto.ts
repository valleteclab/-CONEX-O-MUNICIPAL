import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { BusinessSegmentPresetKey } from '../types/business-segment-preset.types';

const presetKeys: BusinessSegmentPresetKey[] = [
  'beauty_salon',
  'bakery',
  'mini_market',
  'auto_repair',
  'bike_repair',
  'locksmith',
];

export class BusinessSegmentSelectionDto {
  @ApiProperty({ enum: presetKeys })
  @IsString()
  @IsIn(presetKeys)
  segmentPresetKey!: BusinessSegmentPresetKey;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  onboardingAnswers?: Record<string, string | number | boolean>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  applyPresetNow?: boolean;
}
