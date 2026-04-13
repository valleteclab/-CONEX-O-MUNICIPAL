import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ErpBusiness } from '../entities/erp-business.entity';
import { ErpBusinessUser } from '../entities/erp-business-user.entity';
import { ErpProduct } from '../entities/erp-product.entity';
import { ErpParty } from '../entities/erp-party.entity';
import { ErpStockLocation } from '../entities/erp-stock-location.entity';
import { ErpStockBalance } from '../entities/erp-stock-balance.entity';
import { ErpStockMovement } from '../entities/erp-stock-movement.entity';
import { ErpSalesOrder } from '../entities/erp-sales-order.entity';
import { ErpSalesOrderItem } from '../entities/erp-sales-order-item.entity';
import { ErpQuote } from '../entities/erp-quote.entity';
import { ErpQuoteItem } from '../entities/erp-quote-item.entity';
import { ErpPurchaseOrder } from '../entities/erp-purchase-order.entity';
import { ErpPurchaseOrderItem } from '../entities/erp-purchase-order-item.entity';
import { ErpServiceOrder } from '../entities/erp-service-order.entity';
import { ErpServiceOrderItem } from '../entities/erp-service-order-item.entity';
import { ErpAccountReceivable } from '../entities/erp-account-receivable.entity';
import { ErpAccountPayable } from '../entities/erp-account-payable.entity';
import { ErpCashEntry } from '../entities/erp-cash-entry.entity';
import { ErpFiscalDocument } from '../entities/erp-fiscal-document.entity';
import { ErpProductClassificationJob } from '../entities/erp-product-classification-job.entity';
import { ErpProductXmlImport } from '../entities/erp-product-xml-import.entity';
import { ErpProductXmlImportItem } from '../entities/erp-product-xml-import-item.entity';
import { IbgeCity } from '../entities/ibge-city.entity';
import { DirectoryListing } from '../entities/directory-listing.entity';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { ErpBusinessGuard } from './guards/erp-business.guard';
import { ErpBusinessController } from './controllers/erp-business.controller';
import { ErpProductsController } from './controllers/erp-products.controller';
import { ErpPartiesController } from './controllers/erp-parties.controller';
import { ErpStockController } from './controllers/erp-stock.controller';
import { ErpSalesOrdersController } from './controllers/erp-sales-orders.controller';
import { ErpQuotesController } from './controllers/erp-quotes.controller';
import { ErpPurchaseOrdersController } from './controllers/erp-purchase-orders.controller';
import { ErpServiceOrdersController } from './controllers/erp-service-orders.controller';
import { ErpFinanceController } from './controllers/erp-finance.controller';
import { ErpFiscalController } from './controllers/erp-fiscal.controller';
import { ErpCnpjController } from './controllers/erp-cnpj.controller';
import { ErpPublicController } from './controllers/erp-public.controller';
import { ErpBusinessService } from './services/erp-business.service';
import { CnpjLookupService } from './services/cnpj-lookup.service';
import { IbgeCityService } from './services/ibge-city.service';
import { ErpPublicSignupService } from './services/erp-public-signup.service';
import { BusinessSegmentPresetService } from './services/business-segment-preset.service';
import { ErpProductService } from './services/erp-product.service';
import { ErpProductXmlImportService } from './services/erp-product-xml-import.service';
import { ErpPartyService } from './services/erp-party.service';
import { ErpStockService } from './services/erp-stock.service';
import { ErpSalesOrderService } from './services/erp-sales-order.service';
import { ErpQuoteService } from './services/erp-quote.service';
import { ErpPurchaseOrderService } from './services/erp-purchase-order.service';
import { ErpServiceOrderService } from './services/erp-service-order.service';
import { ErpFinanceService } from './services/erp-finance.service';
import { ErpFiscalService } from './services/erp-fiscal.service';
import { PlugNotasService } from './services/plugnotas.service';
import { OpenRouterService } from './services/openrouter.service';
import { ErpProductClassificationWorker } from './services/erp-product-classification.worker';
import { PlatformSettingsModule } from '../platform/platform-settings.module';

@Module({
  imports: [
    ConfigModule,
    PlatformSettingsModule,
    TypeOrmModule.forFeature([
      ErpBusiness,
      ErpBusinessUser,
      ErpProduct,
      ErpParty,
      ErpStockLocation,
      ErpStockBalance,
      ErpStockMovement,
      ErpSalesOrder,
      ErpSalesOrderItem,
      ErpQuote,
      ErpQuoteItem,
      ErpPurchaseOrder,
      ErpPurchaseOrderItem,
      ErpServiceOrder,
      ErpServiceOrderItem,
      ErpAccountReceivable,
      ErpAccountPayable,
      ErpCashEntry,
      ErpFiscalDocument,
      ErpProductClassificationJob,
      ErpProductXmlImport,
      ErpProductXmlImportItem,
      DirectoryListing,
      Tenant,
      User,
      UserTenant,
      IbgeCity,
    ]),
  ],
  controllers: [
    ErpBusinessController,
    ErpProductsController,
    ErpPartiesController,
    ErpStockController,
    ErpSalesOrdersController,
    ErpQuotesController,
    ErpPurchaseOrdersController,
    ErpServiceOrdersController,
    ErpFinanceController,
    ErpFiscalController,
    ErpCnpjController,
    ErpPublicController,
  ],
  providers: [
    ErpBusinessGuard,
    CnpjLookupService,
    IbgeCityService,
    ErpPublicSignupService,
    BusinessSegmentPresetService,
    OpenRouterService,
    ErpBusinessService,
    ErpProductService,
    ErpProductXmlImportService,
    ErpProductClassificationWorker,
    ErpPartyService,
    ErpStockService,
    ErpSalesOrderService,
    ErpQuoteService,
    ErpPurchaseOrderService,
    ErpServiceOrderService,
    ErpFinanceService,
    PlugNotasService,
    ErpFiscalService,
  ],
  exports: [ErpBusinessService, ErpFiscalService, OpenRouterService],
})
export class ErpModule {}
