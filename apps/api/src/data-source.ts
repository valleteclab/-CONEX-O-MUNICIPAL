import 'reflect-metadata';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import {
  AcademyCourse,
  AcademyEnrollment,
  AcademyLesson,
  DirectoryListing,
  EmailVerificationToken,
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

const apiRoot = join(__dirname, '..');
config({ path: join(apiRoot, '.env') });

const entities = [
  Plan,
  Tenant,
  User,
  UserTenant,
  RefreshToken,
  PasswordResetToken,
  EmailVerificationToken,
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
  AcademyLesson,
  AcademyEnrollment,
  DirectoryListing,
  QuotationRequest,
];

function dbConfig() {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return {
      type: 'postgres' as const,
      url,
      ssl: { rejectUnauthorized: false },
    };
  }
  return {
    type: 'postgres' as const,
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    username: process.env.DATABASE_USER ?? 'conexao',
    password: process.env.DATABASE_PASSWORD ?? 'conexao_dev',
    database: process.env.DATABASE_NAME ?? 'conexao_municipal',
  };
}

export default new DataSource({
  ...dbConfig(),
  entities,
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === 'true',
});
