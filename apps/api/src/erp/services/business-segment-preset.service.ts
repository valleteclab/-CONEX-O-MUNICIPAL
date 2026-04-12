import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { DirectoryListing } from '../../entities/directory-listing.entity';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpProduct } from '../../entities/erp-product.entity';
import {
  buildPresetApplication,
  getBusinessSegmentPreset,
  listBusinessSegmentPresets,
} from '../data/business-segment-presets';
import {
  BusinessSegmentOnboardingAnswers,
  BusinessSegmentPresetKey,
} from '../types/business-segment-preset.types';

@Injectable()
export class BusinessSegmentPresetService {
  listAll() {
    return listBusinessSegmentPresets();
  }

  findOne(key: BusinessSegmentPresetKey) {
    const preset = getBusinessSegmentPreset(key);
    if (!preset) {
      throw new BadRequestException('Preset de segmento não encontrado');
    }
    return preset;
  }

  async applyPreset(params: {
    manager: EntityManager;
    business: ErpBusiness;
    ownerUserId: string;
    segmentPresetKey: BusinessSegmentPresetKey;
    onboardingAnswers?: BusinessSegmentOnboardingAnswers;
    forceReapply?: boolean;
  }) {
    const answers = params.onboardingAnswers ?? {};
    const application = buildPresetApplication(params.segmentPresetKey, answers);
    if (!application) {
      throw new BadRequestException('Preset de segmento não encontrado');
    }

    const productRepo = params.manager.getRepository(ErpProduct);
    const listingRepo = params.manager.getRepository(DirectoryListing);
    const createdProducts: Array<{ id: string; sku: string; name: string; kind: 'product' | 'service' }> = [];

    for (const seed of application.seedProducts) {
      const existing = await productRepo.findOne({
        where: {
          businessId: params.business.id,
          tenantId: params.business.tenantId,
          sku: seed.sku,
        },
      });

      if (existing) {
        continue;
      }

      const created = productRepo.create({
        tenantId: params.business.tenantId,
        businessId: params.business.id,
        kind: seed.kind,
        sku: seed.sku,
        name: seed.name,
        description: seed.description ?? null,
        unit: seed.unit ?? 'UN',
        price: seed.price ?? '0',
        minStock: seed.minStock ?? '0',
        cost: '0',
        taxConfig: {
          seededByPreset: true,
          presetKey: application.preset.key,
          presetVersion: application.preset.version,
        },
        isActive: true,
      });
      await productRepo.save(created);
      createdProducts.push({
        id: created.id,
        sku: created.sku,
        name: created.name,
        kind: created.kind,
      });
    }

    let listing = await listingRepo.findOne({
      where: {
        tenantId: params.business.tenantId,
        ownerUserId: params.ownerUserId,
        tradeName: params.business.tradeName,
      },
      order: { createdAt: 'DESC' },
    });

    const baseSlug = this.buildSlug(params.business.tradeName);
    const slug = listing
      ? listing.slug
      : await this.resolveUniqueSlug(listingRepo, params.business.tenantId, baseSlug);

    if (!listing) {
      listing = listingRepo.create({
        tenantId: params.business.tenantId,
        ownerUserId: params.ownerUserId,
        slug,
        tradeName: params.business.tradeName,
        moderationStatus: 'pending',
        isPublished: false,
        category: application.directorySuggestion.category,
        modo: application.directorySuggestion.modo,
        publicHeadline: application.directorySuggestion.publicHeadline,
        description: application.directorySuggestion.description,
        contactInfo: {},
        services: application.directorySuggestion.services,
        offerings: application.directorySuggestion.offerings,
      });
    } else if (params.forceReapply || !listing.category) {
      listing.category = listing.category || application.directorySuggestion.category;
      listing.modo = listing.modo || application.directorySuggestion.modo;
      listing.publicHeadline = listing.publicHeadline || application.directorySuggestion.publicHeadline;
      listing.description = listing.description || application.directorySuggestion.description;
      listing.services = listing.services.length ? listing.services : application.directorySuggestion.services;
      listing.offerings = listing.offerings.length ? listing.offerings : application.directorySuggestion.offerings;
    }
    await listingRepo.save(listing);

    params.business.segmentPresetKey = application.preset.key;
    params.business.segmentPresetVersion = application.preset.version;
    params.business.segmentOnboardingAnswers = answers;
    params.business.segmentPresetApplied = true;
    params.business.fiscalConfig = {
      ...(params.business.fiscalConfig ?? {}),
      segmentPreset: {
        key: application.preset.key,
        version: application.preset.version,
        operationType: application.preset.operationType,
        financeCategories: application.financeCategories,
        erpFocus: application.erpFocus,
        directorySuggestion: application.directorySuggestion,
        lastAppliedAt: new Date().toISOString(),
      },
    };
    await params.manager.save(params.business);

    return {
      segmentPresetKey: application.preset.key,
      segmentPresetVersion: application.preset.version,
      createdProducts,
      directoryListing: {
        id: listing.id,
        slug: listing.slug,
        category: listing.category,
        modo: listing.modo,
      },
      financeCategories: application.financeCategories,
      erpFocus: application.erpFocus,
      pendingReview: [
        'Revisar preços e itens sugeridos do catálogo inicial',
        'Ajustar headline, serviços e ofertas da vitrine pública',
        'Completar dados fiscais e operacionais específicos do negócio',
      ],
    };
  }

  private buildSlug(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100);
  }

  private async resolveUniqueSlug(
    repo: Repository<DirectoryListing>,
    tenantId: string,
    baseSlug: string,
  ) {
    let candidate = baseSlug || 'negocio-local';
    let suffix = 2;
    while (await repo.exists({ where: { tenantId, slug: candidate } })) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}
