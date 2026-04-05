import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
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
  @ApiOperation({ summary: 'Cursos em destaque (SDD §6.4)' })
  async featured(
    @Query('tenant') tenantSlug: string | undefined,
    @Query('take') takeRaw?: string,
  ) {
    const tenantId = await this.academy.resolveTenantId(tenantSlug);
    const take = takeRaw ? parseInt(takeRaw, 10) : 6;
    return this.academy.listFeatured(tenantId, Number.isFinite(take) ? take : 6);
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

  @Get('my-courses/:courseId/certificate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  @ApiOperation({
    summary: 'Certificado (planeado — SDD §6.4)',
    description: 'Resposta 501 até geração PDF/QR.',
  })
  certificate() {
    return {
      message:
        'Certificado digital será disponibilizado numa versão futura (SDD §6.4).',
      status: 'not_implemented',
    };
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

  @Put('my-courses/:courseId/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar progresso (0–100%)' })
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
  @ApiOperation({ summary: 'Marcar curso como concluído' })
  async complete(
    @CurrentUser() user: User,
    @CurrentTenantId() tenantId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.academy.completeCourse(user, tenantId, courseId);
  }
}
