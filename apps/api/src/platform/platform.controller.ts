import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminModerationActionDto } from './dto/admin-moderation-action.dto';
import { CreateLiveSessionDto } from './dto/create-live-session.dto';
import { CreatePlatformCourseDto } from './dto/create-platform-course.dto';
import { CreatePlatformLessonDto } from './dto/create-platform-lesson.dto';
import { UpdateLiveSessionDto } from './dto/update-live-session.dto';
import { UpdatePlatformCourseDto } from './dto/update-platform-course.dto';
import { UpdatePlatformLessonDto } from './dto/update-platform-lesson.dto';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformCoursesService } from './platform-courses.service';
import { PlatformLessonsService } from './platform-lessons.service';
import { PlatformLiveSessionsService } from './platform-live-sessions.service';
import { YoutubePlaylistService } from './youtube-playlist.service';

@ApiTags('plataforma — super admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('platform')
export class PlatformController {
  constructor(
    private readonly platform: PlatformAdminService,
    private readonly platformCourses: PlatformCoursesService,
    private readonly platformLessons: PlatformLessonsService,
    private readonly platformLiveSessions: PlatformLiveSessionsService,
    private readonly youtubePlaylist: YoutubePlaylistService,
  ) {}

  @Get('directory/listings')
  @Roles('super_admin')
  @ApiOperation({
    summary: 'Listar cadastros do diretório (todos os municípios)',
  })
  async listDirectory(
    @Query('status') status?: string,
    @Query('skip') skipStr?: string,
    @Query('take') takeStr?: string,
  ) {
    const skip = Math.max(0, parseInt(skipStr ?? '0', 10) || 0);
    const take = Math.min(100, Math.max(1, parseInt(takeStr ?? '50', 10) || 50));
    return this.platform.listDirectoryListings({ status, skip, take });
  }

  @Patch('directory/listings/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Aprovar, rejeitar, suspender ou republicar vitrine' })
  async patchDirectory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminModerationActionDto,
  ) {
    return this.platform.applyDirectoryAction(id, dto);
  }

  @Get('erp/businesses')
  @Roles('super_admin')
  @ApiOperation({
    summary: 'Listar negócios ERP (todos os municípios)',
  })
  async listErp(
    @Query('status') status?: string,
    @Query('skip') skipStr?: string,
    @Query('take') takeStr?: string,
  ) {
    const skip = Math.max(0, parseInt(skipStr ?? '0', 10) || 0);
    const take = Math.min(100, Math.max(1, parseInt(takeStr ?? '50', 10) || 50));
    return this.platform.listErpBusinesses({ status, skip, take });
  }

  @Patch('erp/businesses/:id')
  @Roles('super_admin')
  @ApiOperation({
    summary: 'Aprovar, rejeitar, suspender ou reativar negócio ERP',
  })
  async patchErp(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminModerationActionDto,
  ) {
    return this.platform.applyErpBusinessAction(id, dto);
  }

  @Get('academy/courses')
  @Roles('super_admin')
  @ApiOperation({
    summary: 'Listar cursos da Academia (todos os municípios)',
  })
  async listAcademyCourses(
    @Query('tenant') tenantSlug?: string,
    @Query('skip') skipStr?: string,
    @Query('take') takeStr?: string,
  ) {
    const skip = Math.max(0, parseInt(skipStr ?? '0', 10) || 0);
    const take = Math.min(100, Math.max(1, parseInt(takeStr ?? '50', 10) || 50));
    return this.platformCourses.list({ skip, take, tenantSlug });
  }

  @Get('academy/youtube/playlist-preview')
  @Roles('super_admin')
  @ApiOperation({
    summary:
      'Pré-visualizar vídeos de uma playlist YouTube (URL com list=…). Requer YOUTUBE_API_KEY para lista completa.',
  })
  async playlistPreview(@Query('url') url?: string) {
    if (!url?.trim()) {
      throw new BadRequestException('Query url é obrigatória');
    }
    return this.youtubePlaylist.previewPlaylistUrl(url.trim());
  }

  @Post('academy/courses')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Criar curso da Academia num município' })
  async createAcademyCourse(@Body() dto: CreatePlatformCourseDto) {
    return this.platformCourses.create(dto);
  }

  @Patch('academy/courses/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Atualizar curso da Academia' })
  async patchAcademyCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlatformCourseDto,
  ) {
    return this.platformCourses.update(id, dto);
  }

  @Delete('academy/courses/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Remover curso da Academia' })
  async deleteAcademyCourse(@Param('id', ParseUUIDPipe) id: string) {
    await this.platformCourses.remove(id);
    return { ok: true };
  }

  @Get('academy/courses/:courseId/lessons')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Listar aulas de um curso' })
  async listLessons(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.platformLessons.listForCourse(courseId);
  }

  @Post('academy/courses/:courseId/lessons')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Criar aula (URL YouTube, texto, etc.)' })
  async createLesson(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreatePlatformLessonDto,
  ) {
    return this.platformLessons.create(courseId, dto);
  }

  @Patch('academy/lessons/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Atualizar aula' })
  async patchLesson(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlatformLessonDto,
  ) {
    return this.platformLessons.update(id, dto);
  }

  @Delete('academy/lessons/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Remover aula' })
  async deleteLesson(@Param('id', ParseUUIDPipe) id: string) {
    await this.platformLessons.remove(id);
    return { ok: true };
  }

  @Get('academy/live-sessions')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Listar aulas ao vivo agendadas' })
  async listLiveSessions(
    @Query('tenant') tenantSlug?: string,
    @Query('skip') skipStr?: string,
    @Query('take') takeStr?: string,
  ) {
    const skip = Math.max(0, parseInt(skipStr ?? '0', 10) || 0);
    const take = Math.min(100, Math.max(1, parseInt(takeStr ?? '50', 10) || 50));
    return this.platformLiveSessions.list({ skip, take, tenantSlug });
  }

  @Post('academy/live-sessions')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Agendar aula ao vivo (Meet/Zoom etc.)' })
  async createLiveSession(@Body() dto: CreateLiveSessionDto) {
    return this.platformLiveSessions.create(dto);
  }

  @Patch('academy/live-sessions/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Atualizar sessão ao vivo' })
  async patchLiveSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLiveSessionDto,
  ) {
    return this.platformLiveSessions.update(id, dto);
  }

  @Delete('academy/live-sessions/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Remover sessão ao vivo' })
  async deleteLiveSession(@Param('id', ParseUUIDPipe) id: string) {
    await this.platformLiveSessions.remove(id);
    return { ok: true };
  }
}
