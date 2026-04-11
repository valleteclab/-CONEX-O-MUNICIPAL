import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformSetting } from '../entities/platform-setting.entity';
import { PlatformSettingsService } from './platform-settings.service';

/** Módulo isolado para evitar dependência circular ErpModule ↔ PlatformModule. */
@Module({
  imports: [TypeOrmModule.forFeature([PlatformSetting])],
  providers: [PlatformSettingsService],
  exports: [PlatformSettingsService],
})
export class PlatformSettingsModule {}
