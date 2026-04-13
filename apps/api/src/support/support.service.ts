import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErpBusiness } from '../entities/erp-business.entity';
import { ErpFiscalDocument } from '../entities/erp-fiscal-document.entity';
import { PlatformSettingsService } from '../platform/platform-settings.service';
import { UpdateErpProductClassifierSettingDto } from '../platform/dto/update-erp-product-classifier-setting.dto';

export type SupportIntegrationKey = 'plugnotas' | 'whatsapp';
export type SupportIntegrationStatusKind =
  | 'healthy'
  | 'warning'
  | 'error'
  | 'disabled'
  | 'not_configured';

export type SupportActionResult = {
  ok: boolean;
  integrationKey: SupportIntegrationKey;
  status: SupportIntegrationStatusKind;
  message: string;
  checkedAt: string;
  details?: string[];
};

export type SupportIntegrationStatus = {
  integrationKey: SupportIntegrationKey;
  label: string;
  status: SupportIntegrationStatusKind;
  environment: string;
  summary: string;
  details: string[];
  actions: { key: string; label: string }[];
};

export type SupportDashboardPayload = {
  ai: {
    provider: string;
    model: string;
    temperature: number;
    maxItemsPerJob: number;
    usage: string[];
  };
  plugnotas: {
    environment: string;
    baseUrl: string;
    configured: boolean;
    webhookConfigured: boolean;
    errorDocumentsLast7Days: number;
    pendingDocuments: number;
    activeBusinesses: number;
  };
  integrations: SupportIntegrationStatus[];
  quickActions: { key: string; label: string; target: string }[];
};

@Injectable()
export class SupportService {
  constructor(
    private readonly config: ConfigService,
    private readonly platformSettings: PlatformSettingsService,
    @InjectRepository(ErpFiscalDocument)
    private readonly fiscalDocs: Repository<ErpFiscalDocument>,
    @InjectRepository(ErpBusiness)
    private readonly businesses: Repository<ErpBusiness>,
  ) {}

  async getDashboard(): Promise<SupportDashboardPayload> {
    const [ai, integrations, plugnotasCounts, activeBusinesses] = await Promise.all([
      this.platformSettings.getErpProductClassifier(),
      this.listIntegrations(),
      this.getPlugNotasCounts(),
      this.businesses.count({ where: { isActive: true } }),
    ]);

    return {
      ai: {
        provider: ai.provider,
        model: ai.model,
        temperature: ai.temperature,
        maxItemsPerJob: ai.maxItemsPerJob,
        usage: [
          'Classificacao fiscal de produtos do ERP',
          'Sugestoes operacionais de IA da plataforma',
        ],
      },
      plugnotas: {
        environment: this.config.get<boolean>('fiscal.sandbox', true)
          ? 'sandbox'
          : 'production',
        baseUrl: this.config.get<string>('fiscal.plugnotasBaseUrl', ''),
        configured: Boolean(
          this.config.get<string>('fiscal.plugnotasApiKey', '').trim() &&
            this.config.get<string>('fiscal.plugnotasBaseUrl', '').trim(),
        ),
        webhookConfigured: Boolean(
          this.config.get<string>('fiscal.webhookSecret', '').trim(),
        ),
        errorDocumentsLast7Days: plugnotasCounts.errorDocumentsLast7Days,
        pendingDocuments: plugnotasCounts.pendingDocuments,
        activeBusinesses,
      },
      integrations,
      quickActions: [
        {
          key: 'ai-settings',
          label: 'Ajustar IA operacional',
          target: '/suporte-tecnico/ia',
        },
        {
          key: 'test-plugnotas',
          label: 'Testar PlugNotas',
          target: '/suporte-tecnico/integracoes',
        },
      ],
    };
  }

  async listIntegrations(): Promise<SupportIntegrationStatus[]> {
    return [this.buildPlugNotasStatus(), this.buildWhatsappStatus()];
  }

  async getIntegration(key: string): Promise<SupportIntegrationStatus> {
    const integrations = await this.listIntegrations();
    const match = integrations.find((item) => item.integrationKey === key);
    if (!match) {
      throw new NotFoundException('Integracao nao encontrada');
    }
    return match;
  }

  async testIntegration(key: string): Promise<SupportActionResult> {
    if (key !== 'plugnotas' && key !== 'whatsapp') {
      throw new NotFoundException('Integracao nao encontrada');
    }

    if (key === 'plugnotas') {
      const baseUrl = this.config.get<string>('fiscal.plugnotasBaseUrl', '').trim();
      const apiKey = this.config.get<string>('fiscal.plugnotasApiKey', '').trim();
      if (!baseUrl || !apiKey) {
        return {
          ok: false,
          integrationKey: 'plugnotas',
          status: 'not_configured',
          message: 'PlugNotas nao configurado no servidor.',
          checkedAt: new Date().toISOString(),
          details: ['Defina PLUGNOTAS_BASE_URL e PLUGNOTAS_API_KEY.'],
        };
      }
      return this.probeHttpIntegration('plugnotas', baseUrl, {
        'x-api-key': apiKey,
      });
    }

    const baseUrl = this.config
      .get<string>('integrations.whatsappBaseUrl', '')
      .trim();
    const apiKey = this.config
      .get<string>('integrations.whatsappApiToken', '')
      .trim();
    if (!baseUrl) {
      return {
        ok: false,
        integrationKey: 'whatsapp',
        status: 'not_configured',
        message: 'WhatsApp ainda nao configurado.',
        checkedAt: new Date().toISOString(),
        details: ['Defina WHATSAPP_API_BASE_URL para habilitar o teste.'],
      };
    }
    return this.probeHttpIntegration(
      'whatsapp',
      baseUrl,
      apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    );
  }

  getAiSettings() {
    return this.platformSettings.getErpProductClassifier();
  }

  patchAiSettings(dto: UpdateErpProductClassifierSettingDto) {
    return this.platformSettings.patchErpProductClassifier(dto);
  }

  private async getPlugNotasCounts(): Promise<{
    errorDocumentsLast7Days: number;
    pendingDocuments: number;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [errors, pending] = await Promise.all([
      this.fiscalDocs
        .createQueryBuilder('doc')
        .where('doc.createdAt >= :since', { since: since.toISOString() })
        .andWhere('doc.status IN (:...statuses)', {
          statuses: ['error', 'rejected'],
        })
        .getCount(),
      this.fiscalDocs
        .createQueryBuilder('doc')
        .where('doc.status IN (:...statuses)', {
          statuses: ['pending', 'processing'],
        })
        .getCount(),
    ]);

    return {
      errorDocumentsLast7Days: errors,
      pendingDocuments: pending,
    };
  }

  private buildPlugNotasStatus(): SupportIntegrationStatus {
    const baseUrl = this.config.get<string>('fiscal.plugnotasBaseUrl', '').trim();
    const apiKey = this.config.get<string>('fiscal.plugnotasApiKey', '').trim();
    const sandbox = this.config.get<boolean>('fiscal.sandbox', true);
    const webhook = this.config.get<string>('fiscal.webhookSecret', '').trim();
    const configured = Boolean(baseUrl && apiKey);

    return {
      integrationKey: 'plugnotas',
      label: 'PlugNotas',
      status: configured ? (webhook ? 'healthy' : 'warning') : 'not_configured',
      environment: sandbox ? 'sandbox' : 'production',
      summary: configured
        ? webhook
          ? 'Configuracao fiscal pronta para operacao.'
          : 'Configurado, mas sem segredo de webhook definido.'
        : 'Configuracao fiscal incompleta no servidor.',
      details: [
        `Base URL: ${baseUrl || 'nao definida'}`,
        `API key: ${apiKey ? 'configurada' : 'nao configurada'}`,
        `Webhook secret: ${webhook ? 'configurado' : 'nao configurado'}`,
      ],
      actions: [{ key: 'test', label: 'Testar conexao' }],
    };
  }

  private buildWhatsappStatus(): SupportIntegrationStatus {
    const baseUrl = this.config
      .get<string>('integrations.whatsappBaseUrl', '')
      .trim();
    const token = this.config
      .get<string>('integrations.whatsappApiToken', '')
      .trim();
    const phoneId = this.config
      .get<string>('integrations.whatsappPhoneNumberId', '')
      .trim();
    const businessId = this.config
      .get<string>('integrations.whatsappBusinessAccountId', '')
      .trim();
    const configured = Boolean(baseUrl && token);

    return {
      integrationKey: 'whatsapp',
      label: 'WhatsApp',
      status: configured ? 'warning' : 'not_configured',
      environment: baseUrl ? 'external' : 'not_configured',
      summary: configured
        ? 'Credenciais basicas presentes. Integracao funcional ainda em preparacao.'
        : 'Integracao ainda nao configurada.',
      details: [
        `Base URL: ${baseUrl || 'nao definida'}`,
        `Token: ${token ? 'configurado' : 'nao configurado'}`,
        `Phone number id: ${phoneId || 'nao definido'}`,
        `Business account id: ${businessId || 'nao definido'}`,
      ],
      actions: [{ key: 'test', label: 'Testar conectividade' }],
    };
  }

  private async probeHttpIntegration(
    integrationKey: SupportIntegrationKey,
    url: string,
    headers?: Record<string, string>,
  ): Promise<SupportActionResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      const status =
        response.status >= 500
          ? 'error'
          : response.ok
            ? 'healthy'
            : 'warning';
      return {
        ok: response.status < 500,
        integrationKey,
        status,
        message: response.ok
          ? 'Integracao respondeu com sucesso.'
          : `Integracao respondeu HTTP ${response.status}.`,
        checkedAt: new Date().toISOString(),
        details: [`URL testada: ${url}`],
      };
    } catch (error) {
      return {
        ok: false,
        integrationKey,
        status: 'error',
        message: 'Falha ao contactar a integracao.',
        checkedAt: new Date().toISOString(),
        details: [error instanceof Error ? error.message : 'Erro desconhecido'],
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
