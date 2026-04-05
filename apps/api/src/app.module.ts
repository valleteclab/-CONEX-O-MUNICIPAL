import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AcademyModule } from './academy/academy.module';
import { AuthModule } from './auth/auth.module';
import { DirectoryModule } from './directory/directory.module';
import { ErpModule } from './erp/erp.module';
import { QuotationsModule } from './quotations/quotations.module';
import { UsersModule } from './users/users.module';
import {
  AcademyCourse,
  DirectoryListing,
  ErpAccountPayable,
  ErpAccountReceivable,
  ErpBusiness,
  ErpBusinessUser,
  ErpCashEntry,
  ErpParty,
  ErpProduct,
  ErpPurchaseOrder,
  ErpPurchaseOrderItem,
  ErpSalesOrder,
  ErpSalesOrderItem,
  ErpStockBalance,
  ErpStockLocation,
  ErpStockMovement,
  PasswordResetToken,
  Plan,
  QuotationRequest,
  RefreshToken,
  Tenant,
  User,
  UserTenant,
} from './entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => {
        const entities = [
          Plan,
          Tenant,
          User,
          UserTenant,
          RefreshToken,
          PasswordResetToken,
          ErpBusiness,
          ErpBusinessUser,
          ErpProduct,
          ErpParty,
          ErpStockLocation,
          ErpStockBalance,
          ErpStockMovement,
          ErpSalesOrder,
          ErpSalesOrderItem,
          ErpPurchaseOrder,
          ErpPurchaseOrderItem,
          ErpAccountReceivable,
          ErpAccountPayable,
          ErpCashEntry,
          AcademyCourse,
          DirectoryListing,
          QuotationRequest,
        ];
        const common = {
          entities,
          synchronize: process.env.TYPEORM_SYNC === 'true',
          logging: process.env.NODE_ENV !== 'production',
        };
        const dbUrl = process.env.DATABASE_URL?.trim();
        if (dbUrl) {
          return {
            type: 'postgres' as const,
            url: dbUrl,
            ssl: { rejectUnauthorized: false },
            ...common,
          };
        }
        return {
          type: 'postgres' as const,
          host: process.env.DATABASE_HOST ?? 'localhost',
          port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
          username: process.env.DATABASE_USER ?? 'conexao',
          password: process.env.DATABASE_PASSWORD ?? 'conexao_dev',
          database: process.env.DATABASE_NAME ?? 'conexao_municipal',
          ...common,
        };
      },
    }),
    AcademyModule,
    AuthModule,
    DirectoryModule,
    QuotationsModule,
    UsersModule,
    ErpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
