import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DirectoryModule } from './directory/directory.module';
import { ErpModule } from './erp/erp.module';
import { UsersModule } from './users/users.module';
import {
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
          DirectoryListing,
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
    AuthModule,
    DirectoryModule,
    UsersModule,
    ErpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
