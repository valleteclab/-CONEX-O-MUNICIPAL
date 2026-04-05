import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademyCourse } from '../entities/academy-course.entity';
import { AcademyLesson } from '../entities/academy-lesson.entity';
import { CreatePlatformLessonDto } from './dto/create-platform-lesson.dto';
import { UpdatePlatformLessonDto } from './dto/update-platform-lesson.dto';

@Injectable()
export class PlatformLessonsService {
  constructor(
    @InjectRepository(AcademyCourse)
    private readonly courses: Repository<AcademyCourse>,
    @InjectRepository(AcademyLesson)
    private readonly lessons: Repository<AcademyLesson>,
  ) {}

  async listForCourse(courseId: string): Promise<AcademyLesson[]> {
    await this.requireCourse(courseId);
    return this.lessons.find({
      where: { courseId },
      order: { sortOrder: 'ASC', title: 'ASC' },
    });
  }

  async create(
    courseId: string,
    dto: CreatePlatformLessonDto,
  ): Promise<AcademyLesson> {
    await this.requireCourse(courseId);
    const row = this.lessons.create({
      courseId,
      title: dto.title.trim(),
      videoUrl: dto.videoUrl?.trim() || null,
      contentMd: dto.contentMd?.trim() || null,
      sortOrder: dto.sortOrder ?? 0,
      durationMinutes: dto.durationMinutes ?? null,
      lessonKind: dto.lessonKind ?? 'youtube',
    });
    return this.lessons.save(row);
  }

  async update(id: string, dto: UpdatePlatformLessonDto): Promise<AcademyLesson> {
    const row = await this.lessons.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Aula não encontrada');
    }
    if (dto.title !== undefined) {
      row.title = dto.title.trim();
    }
    if (dto.videoUrl !== undefined) {
      row.videoUrl = dto.videoUrl?.trim() || null;
    }
    if (dto.contentMd !== undefined) {
      row.contentMd = dto.contentMd?.trim() || null;
    }
    if (dto.sortOrder !== undefined) {
      row.sortOrder = dto.sortOrder;
    }
    if (dto.durationMinutes !== undefined) {
      row.durationMinutes = dto.durationMinutes;
    }
    if (dto.lessonKind !== undefined) {
      row.lessonKind = dto.lessonKind;
    }
    return this.lessons.save(row);
  }

  async remove(id: string): Promise<void> {
    const r = await this.lessons.delete({ id });
    if (!r.affected) {
      throw new NotFoundException('Aula não encontrada');
    }
  }

  private async requireCourse(id: string): Promise<AcademyCourse> {
    const c = await this.courses.findOne({ where: { id } });
    if (!c) {
      throw new NotFoundException('Curso não encontrado');
    }
    return c;
  }
}
