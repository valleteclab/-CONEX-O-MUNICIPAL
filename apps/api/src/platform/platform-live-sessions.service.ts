import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademyLiveSession } from '../entities/academy-live-session.entity';
import { Tenant } from '../entities/tenant.entity';
import { CreateLiveSessionDto } from './dto/create-live-session.dto';
import { UpdateLiveSessionDto } from './dto/update-live-session.dto';

@Injectable()
export class PlatformLiveSessionsService {
  constructor(
    @InjectRepository(AcademyLiveSession)
    private readonly sessions: Repository<AcademyLiveSession>,
    @InjectRepository(Tenant)
    private readonly tenants: Repository<Tenant>,
  ) {}

  async list(query: {
    skip: number;
    take: number;
    tenantSlug?: string;
  }): Promise<{ items: AcademyLiveSession[]; total: number }> {
    const take = Math.min(100, Math.max(1, query.take));
    const skip = Math.max(0, query.skip);
    const qb = this.sessions
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.tenant', 'tenant')
      .leftJoinAndSelect('s.course', 'course')
      .orderBy('s.startsAt', 'DESC')
      .skip(skip)
      .take(take);
    if (query.tenantSlug?.trim()) {
      qb.andWhere('tenant.slug = :slug', { slug: query.tenantSlug.trim() });
    }
    return qb.getManyAndCount().then(([items, total]) => ({ items, total }));
  }

  async create(dto: CreateLiveSessionDto): Promise<AcademyLiveSession> {
    const tenant = await this.tenants.findOne({
      where: { slug: dto.tenantSlug.trim() },
    });
    if (!tenant) {
      throw new NotFoundException(`Município não encontrado: ${dto.tenantSlug}`);
    }
    const row = this.sessions.create({
      tenantId: tenant.id,
      courseId: dto.courseId ?? null,
      title: dto.title.trim(),
      summary: dto.summary?.trim() || null,
      startsAt: new Date(dto.startsAt),
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      meetingUrl: dto.meetingUrl.trim(),
      isPublished: dto.isPublished ?? true,
    });
    return this.sessions.save(row);
  }

  async update(id: string, dto: UpdateLiveSessionDto): Promise<AcademyLiveSession> {
    const row = await this.sessions.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Sessão não encontrada');
    }
    if (dto.courseId !== undefined) {
      row.courseId = dto.courseId;
    }
    if (dto.title !== undefined) {
      row.title = dto.title.trim();
    }
    if (dto.summary !== undefined) {
      row.summary = dto.summary?.trim() || null;
    }
    if (dto.startsAt !== undefined) {
      row.startsAt = new Date(dto.startsAt);
    }
    if (dto.endsAt !== undefined) {
      row.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    }
    if (dto.meetingUrl !== undefined) {
      row.meetingUrl = dto.meetingUrl.trim();
    }
    if (dto.isPublished !== undefined) {
      row.isPublished = dto.isPublished;
    }
    return this.sessions.save(row);
  }

  async remove(id: string): Promise<void> {
    const r = await this.sessions.delete({ id });
    if (!r.affected) {
      throw new NotFoundException('Sessão não encontrada');
    }
  }
}
