import type { ErpBusiness } from '../entities/erp-business.entity';

declare global {
  namespace Express {
    interface Request {
      erpBusiness?: ErpBusiness;
      erpBusinessRole?: string;
    }
  }
}

export {};
