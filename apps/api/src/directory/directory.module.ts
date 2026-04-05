import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DirectoryListing } from '../entities/directory-listing.entity';
import { Tenant } from '../entities/tenant.entity';
import { DirectoryController } from './directory.controller';
import { DirectoryService } from './directory.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, DirectoryListing])],
  controllers: [DirectoryController],
  providers: [DirectoryService],
  exports: [DirectoryService],
})
export class DirectoryModule {}
