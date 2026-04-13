import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type OpenRouterChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type OpenRouterChatRequest = {
  model: string;
  messages: OpenRouterChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
};

type OpenRouterChatResponse = {
  id?: string;
  choices?: Array<{
    message?: { content?: string };
  }>;
};

type OpenRouterModelResponse = {
  data?: Array<{
    id?: string;
    name?: string;
    context_length?: number;
    pricing?: {
      prompt?: string;
      completion?: string;
    };
    top_provider?: {
      context_length?: number;
    };
  }>;
};

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('ai.openrouterApiKey', '');
    this.baseUrl =
      this.config.get<string>('ai.openrouterBaseUrl') ??
      'https://openrouter.ai/api/v1';
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private authHeaders(): Record<string, string> {
    return this.apiKey
      ? {
          Authorization: `Bearer ${this.apiKey}`,
        }
      : {};
  }

  private async request<T>(path: string, body: object): Promise<T> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'IA indisponível: configure OPENROUTER_API_KEY no servidor.',
      );
    }
    const url = `${this.baseUrl.replace(/\/+$/, '')}${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.warn(`OpenRouter network error: ${(err as Error).message}`);
      throw new BadGatewayException('Falha de comunicação com o provedor de IA');
    }

    const text = await res.text().catch(() => '');
    if (!res.ok) {
      this.logger.warn(`OpenRouter ${res.status}: ${text}`);
      throw new BadGatewayException(
        `IA retornou ${res.status}. Verifique OPENROUTER_API_KEY/modelo.`,
      );
    }
    try {
      return (text ? JSON.parse(text) : {}) as T;
    } catch {
      return text as unknown as T;
    }
  }

  private async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl.replace(/\/+$/, '')}${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: this.authHeaders(),
      });
    } catch (err) {
      this.logger.warn(`OpenRouter network error: ${(err as Error).message}`);
      throw new BadGatewayException('Falha de comunicacao com o provedor de IA');
    }

    const text = await res.text().catch(() => '');
    if (!res.ok) {
      this.logger.warn(`OpenRouter ${res.status}: ${text}`);
      throw new BadGatewayException(
        `OpenRouter retornou ${res.status} ao consultar modelos.`,
      );
    }
    try {
      return (text ? JSON.parse(text) : {}) as T;
    } catch {
      return text as unknown as T;
    }
  }

  async chatJson(params: {
    model: string;
    messages: OpenRouterChatMessage[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ rawId?: string; json: unknown; text: string }> {
    const payload: OpenRouterChatRequest = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      response_format: { type: 'json_object' },
    };
    const res = await this.request<OpenRouterChatResponse>(
      '/chat/completions',
      payload,
    );
    const content = res.choices?.[0]?.message?.content ?? '';
    let json: unknown = null;
    try {
      json = content ? JSON.parse(content) : null;
    } catch {
      json = null;
    }
    return { rawId: res.id, json, text: content };
  }

  async listModels(): Promise<
    Array<{
      id: string;
      name: string;
      contextLength: number | null;
      promptPrice: string | null;
      completionPrice: string | null;
    }>
  > {
    const response = await this.get<OpenRouterModelResponse>('/models');
    return (response.data ?? [])
      .filter((model) => typeof model.id === 'string' && model.id.trim())
      .map((model) => ({
        id: model.id!.trim(),
        name: model.name?.trim() || model.id!.trim(),
        contextLength:
          typeof model.context_length === 'number'
            ? model.context_length
            : typeof model.top_provider?.context_length === 'number'
              ? model.top_provider.context_length
              : null,
        promptPrice:
          typeof model.pricing?.prompt === 'string'
            ? model.pricing.prompt
            : null,
        completionPrice:
          typeof model.pricing?.completion === 'string'
            ? model.pricing.completion
            : null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }
}

