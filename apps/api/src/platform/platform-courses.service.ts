import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademyCourse } from '../entities/academy-course.entity';
import { Tenant } from '../entities/tenant.entity';
import { CreatePlatformCourseDto } from './dto/create-platform-course.dto';
import { UpdatePlatformCourseDto } from './dto/update-platform-course.dto';
import { PlatformLessonsService } from './platform-lessons.service';
import {
  extractYoutubePlaylistId,
  YoutubePlaylistService,
} from './youtube-playlist.service';

@Injectable()
export class PlatformCoursesService {
  constructor(
    @InjectRepository(AcademyCourse)
    private readonly courses: Repository<AcademyCourse>,
    @InjectRepository(Tenant)
    private readonly tenants: Repository<Tenant>,
    private readonly platformLessons: PlatformLessonsService,
    private readonly youtubePlaylist: YoutubePlaylistService,
  ) {}

  async list(query: {
    skip: number;
    take: number;
    tenantSlug?: string;
  }): Promise<{ items: AcademyCourse[]; total: number }> {
    const take = Math.min(100, Math.max(1, query.take));
    const skip = Math.max(0, query.skip);
    const qb = this.courses
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.tenant', 'tenant')
      .orderBy('c.createdAt', 'DESC')
      .skip(skip)
      .take(take);
    if (query.tenantSlug?.trim()) {
      qb.andWhere('tenant.slug = :slug', { slug: query.tenantSlug.trim() });
    }
    return qb.getManyAndCount().then(([items, total]) => ({ items, total }));
  }

  async create(dto: CreatePlatformCourseDto): Promise<AcademyCourse> {
    const tenant = await this.tenants.findOne({
      where: { slug: dto.tenantSlug.trim() },
    });
    if (!tenant) {
      throw new NotFoundException(`Município não encontrado: ${dto.tenantSlug}`);
    }
    const base =
      dto.slug?.trim() !== undefined && dto.slug.trim() !== ''
        ? this.normalizeSlug(dto.slug.trim())
        : this.slugifyTitle(dto.title);
    const slug = await this.ensureUniqueSlug(tenant.id, base);
    const row = this.courses.create({
      tenantId: tenant.id,
      title: dto.title.trim(),
      slug,
      summary: dto.summary?.trim() || null,
      category: dto.category?.trim() || null,
      durationMinutes: dto.durationMinutes ?? null,
      isFeatured: dto.isFeatured ?? false,
      isPublished: dto.isPublished ?? true,
    });
    const saved = await this.courses.save(row);
    const yt = dto.firstLessonYoutubeUrl?.trim();
    if (yt) {
      const playlistId = extractYoutubePlaylistId(yt);
      if (playlistId) {
        const items = await this.youtubePlaylist.listPlaylistVideos(playlistId);
        if (!items.length) {
          throw new BadRequestException(
            'Playlist sem vídeos acessíveis. Configure YOUTUBE_API_KEY na API (Google Cloud, YouTube Data API v3) para importar a trilha completa.',
          );
        }
        let order = 0;
        for (const it of items) {
          await this.platformLessons.create(saved.id, {
            title: it.title,
            videoUrl: it.videoUrl,
            lessonKind: 'youtube',
            sortOrder: order++,
          });
        }
      } else {
        const lessonTitle =
          dto.firstLessonTitle?.trim() || 'Aula em vídeo';
        await this.platformLessons.create(saved.id, {
          title: lessonTitle,
          videoUrl: yt,
          lessonKind: 'youtube',
          sortOrder: 0,
        });
      }
    }
    return saved;
  }

  async update(id: string, dto: UpdatePlatformCourseDto): Promise<AcademyCourse> {
    const row = await this.courses.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Curso não encontrado');
    }
    if (dto.title !== undefined) {
      row.title = dto.title.trim();
    }
    if (dto.summary !== undefined) {
      row.summary = dto.summary?.trim() || null;
    }
    if (dto.category !== undefined) {
      row.category = dto.category?.trim() || null;
    }
    if (dto.durationMinutes !== undefined) {
      row.durationMinutes = dto.durationMinutes;
    }
    if (dto.isFeatured !== undefined) {
      row.isFeatured = dto.isFeatured;
    }
    if (dto.isPublished !== undefined) {
      row.isPublished = dto.isPublished;
    }
    if (dto.slug !== undefined && dto.slug.trim() !== '') {
      const base = this.normalizeSlug(dto.slug.trim());
      row.slug = await this.ensureUniqueSlug(row.tenantId, base, row.id);
    }
    return this.courses.save(row);
  }

  async remove(id: string): Promise<void> {
    const r = await this.courses.delete({ id });
    if (!r.affected) {
      throw new NotFoundException('Curso não encontrado');
    }
  }

  private slugifyTitle(title: string): string {
    const n = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let s = n
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 140);
    if (!s) {
      s = 'curso';
    }
    return s;
  }

  private normalizeSlug(raw: string): string {
    return raw
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 160);
  }

  private async ensureUniqueSlug(
    tenantId: string,
    base: string,
    excludeCourseId?: string,
  ): Promise<string> {
    let slug = base.slice(0, 160) || 'curso';
    let counter = 0;
    for (;;) {
      const qb = this.courses
        .createQueryBuilder('c')
        .where('c.tenantId = :tenantId', { tenantId })
        .andWhere('c.slug = :slug', { slug });
      if (excludeCourseId) {
        qb.andWhere('c.id != :excludeId', { excludeId: excludeCourseId });
      }
      const exists = await qb.getOne();
      if (!exists) {
        return slug;
      }
      counter += 1;
      const suffix = `-${counter}`;
      const maxBase = 160 - suffix.length;
      slug = `${base.slice(0, Math.max(1, maxBase))}${suffix}`;
    }
  }
}
