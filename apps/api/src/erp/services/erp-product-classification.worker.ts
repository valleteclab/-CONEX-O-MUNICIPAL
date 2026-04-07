import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ErpProductService } from './erp-product.service';

@Injectable()
export class ErpProductClassificationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ErpProductClassificationWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly products: ErpProductService) {}

  onModuleInit() {
    // Poll simples. Produção: migrar para fila (Bull/Redis).
    this.timer = setInterval(() => void this.tick(), 3000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const processed = await this.products.runOneQueuedClassificationJob();
      if (processed) this.logger.debug('Processed classification job');
    } catch (err) {
      this.logger.warn(`Worker error: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}

