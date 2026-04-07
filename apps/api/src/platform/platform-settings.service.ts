import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSetting } from '../entities/platform-setting.entity';
import { UpdateErpProductClassifierSettingDto } from './dto/update-erp-product-classifier-setting.dto';

export type ErpProductClassifierSetting = {
  provider: 'openrouter';
  model: string;
  temperature: number;
  maxItemsPerJob: number;
};

const KEY = 'erp.productClassifier';

@Injectable()
export class PlatformSettingsService {
  constructor(
    @InjectRepository(PlatformSetting)
    private readonly settings: Repository<PlatformSetting>,
  ) {}

  private defaultValue(): ErpProductClassifierSetting {
    return {
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
      temperature: 0.2,
      maxItemsPerJob: 50,
    };
  }

  async getErpProductClassifier(): Promise<ErpProductClassifierSetting> {
    const row = await this.settings.findOne({ where: { key: KEY } });
    if (!row) return this.defaultValue();
    const v = row.value as Partial<ErpProductClassifierSetting>;
    const d = this.defaultValue();
    return {
      provider: 'openrouter',
      model: typeof v.model === 'string' && v.model ? v.model : d.model,
      temperature: typeof v.temperature === 'number' ? v.temperature : d.temperature,
      maxItemsPerJob:
        typeof v.maxItemsPerJob === 'number' ? v.maxItemsPerJob : d.maxItemsPerJob,
    };
  }

  async patchErpProductClassifier(
    dto: UpdateErpProductClassifierSettingDto,
  ): Promise<ErpProductClassifierSetting> {
    const current = await this.getErpProductClassifier();
    const next: ErpProductClassifierSetting = {
      ...current,
      ...(dto.model !== undefined ? { model: dto.model } : {}),
      ...(dto.temperature !== undefined ? { temperature: dto.temperature } : {}),
      ...(dto.maxItemsPerJob !== undefined
        ? { maxItemsPerJob: dto.maxItemsPerJob }
        : {}),
    };
    const row = await this.settings.findOne({ where: { key: KEY } });
    if (!row) {
      await this.settings.save(
        this.settings.create({ key: KEY, value: next as unknown as Record<string, unknown> }),
      );
    } else {
      row.value = next as unknown as Record<string, unknown>;
      await this.settings.save(row);
    }
    return next;
  }
}

