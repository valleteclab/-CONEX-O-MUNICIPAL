import {
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
import { CreatePlatformCourseDto } from './dto/create-platform-course.dto';
import { UpdatePlatformCourseDto } from './dto/update-platform-course.dto';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformCoursesService } from './platform-courses.service';

@ApiTags('plataforma — super admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('platform')
export class PlatformController {
  constructor(
    private readonly platform: PlatformAdminService,
    private readonly platformCourses: PlatformCoursesService,
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
}
