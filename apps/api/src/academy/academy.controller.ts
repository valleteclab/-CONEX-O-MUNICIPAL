import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentTenantId } from '../common/decorators/current-tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AcademyService } from './academy.service';
import { ListAcademyQueryDto } from './dto/list-academy-query.dto';
import { UpdateEnrollmentProgressDto } from './dto/update-enrollment-progress.dto';

@ApiTags('academia')
@Controller('academy')
export class AcademyController {
  constructor(private readonly academy: AcademyService) {}

  @Get('courses/featured')
  @ApiOperation({ summary: 'Cursos em destaque' })
  async featured(
    @Query('tenant') tenantSlug: string | undefined,
    @Query('take') takeRaw?: string,
  ) {
    const tenantId = await this.academy.resolveTenantId(tenantSlug);
    const take = takeRaw ? parseInt(takeRaw, 10) : 6;
    return this.academy.listFeatured(tenantId, Number.isFinite(take) ? take : 6);
  }

  @Get('courses/categories')
  @ApiOperation({
    summary: 'Listar categorias distintas dos cursos publicados (filtros)',
  })
  async courseCategories(@Query('tenant') tenantSlug: string | undefined) {
    const tenantId = await this.academy.resolveTenantId(tenantSlug);
    return this.academy.listCategoryLabels(tenantId);
  }

  @Get('live-sessions')
  @ApiOperation({ summary: 'Próximas aulas ao vivo publicadas (por município)' })
  async publicLiveSessions(
    @Query('tenant') tenantSlug: string | undefined,
    @Query('take') takeRaw?: string,
  ) {
    const tenantId = await this.academy.resolveTenantId(tenantSlug);
    const take = takeRaw ? parseInt(takeRaw, 10) : 20;
    return this.academy.listLiveSessions(tenantId, {
      take: Number.isFinite(take) ? take : 20,
      skip: 0,
    });
  }

  @Get('courses/:slug/learning')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Detalhe do curso com matrícula, aulas concluídas e pontos (utilizador autenticado)',
  })
  async learning(
    @CurrentUser() user: User,
    @CurrentTenantId() tenantId: string,
    @Param('slug') slug: string,
  ) {
    return this.academy.getLearningView(user, tenantId, slug);
  }

  @Get('courses/:slug')
  @ApiOperation({ summary: 'Detalhe do curso + aulas (público)' })
  async courseDetail(
    @Param('slug') slug: string,
    @Query('tenant') tenantSlug: string | undefined,
  ) {
    const tenantId = await this.academy.resolveTenantId(tenantSlug);
    return this.academy.getCourseBySlug(tenantId, slug);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Listar cursos publicados (por tenant)' })
  async listCourses(@Query() query: ListAcademyQueryDto) {
    const tenantId = await this.academy.resolveTenantId(query.tenant);
    return this.academy.listPublic(tenantId, query);
  }

  @Post('courses/:courseId/enroll')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Matricular-se no curso' })
  async enroll(
    @CurrentUser() user: User,
    @CurrentTenantId() tenantId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.academy.enroll(user, tenantId, courseId);
  }

  @Post('courses/:courseId/lessons/:lessonId/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marcar aula como concluída (atualiza progresso do curso)' })
  async completeLesson(
    @CurrentUser() user: User,
    @CurrentTenantId() tenantId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.academy.markLessonComplete(
      user,
      tenantId,
      courseId,
      lessonId,
    );
  }

  @Get('my-courses/:courseId/certificate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiProduces('application/pdf')
  @ApiOperation({ summary: 'Certificado PDF (após conclusão do curso)' })
  async certificate(
    @CurrentUser() user: User,
    @CurrentTenantId() tenantId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    const bytes = await this.academy.getCertificatePdf(user, tenantId, courseId);
    return new StreamableFile(Buffer.from(bytes), {
      type: 'application/pdf',
      disposition: `attachment; filename="certificado-${courseId.slice(0, 8)}.pdf"`,
    });
  }

  @Get('my-courses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Meus cursos e progresso' })
  async myCourses(
    @CurrentUser() user: User,
    @CurrentTenantId() tenantId: string,
    @Query() query: ListAcademyQueryDto,
  ) {
    return this.academy.listMyCourses(user.id, tenantId, query);
  }

  @Get('gamification/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Pontos e distintivos (Academia) no município atual — resposta inclui `points` e `badges`',
  })
  async gamificationMe(
    @CurrentUser() user: User,
    @CurrentTenantId() tenantId: string,
  ) {
    return this.academy.getGamificationSummary(user.id, tenantId);
  }

  @Put('my-courses/:courseId/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar progresso (0–100%) manual' })
  async progress(
    @CurrentUser() user: User,
    @CurrentTenantId() tenantId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: UpdateEnrollmentProgressDto,
  ) {
    return this.academy.updateProgress(user, tenantId, courseId, dto);
  }

  @Post('my-courses/:courseId/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marcar curso como concluído (atalho)' })
  async complete(
    @CurrentUser() user: User,
    @CurrentTenantId() tenantId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.academy.completeCourse(user, tenantId, courseId);
  }
}
