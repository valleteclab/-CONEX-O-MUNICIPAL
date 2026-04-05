import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DirectoryListing } from '../entities/directory-listing.entity';
import { ErpBusiness } from '../entities/erp-business.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlatformController } from './platform.controller';
import { PlatformAdminService } from './platform-admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([DirectoryListing, ErpBusiness])],
  controllers: [PlatformController],
  providers: [PlatformAdminService, RolesGuard],
})
export class PlatformModule {}
