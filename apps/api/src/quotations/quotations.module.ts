import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotationRequest } from '../entities/quotation-request.entity';
import { Tenant } from '../entities/tenant.entity';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';

@Module({
  imports: [TypeOrmModule.forFeature([QuotationRequest, Tenant])],
  controllers: [QuotationsController],
  providers: [QuotationsService],
})
export class QuotationsModule {}
