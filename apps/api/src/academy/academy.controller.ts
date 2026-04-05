import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListAcademyQueryDto } from './dto/list-academy-query.dto';
import { AcademyService } from './academy.service';

@ApiTags('academia')
@Controller('academy')
export class AcademyController {
  constructor(private readonly academy: AcademyService) {}

  @Get('courses')
  @ApiOperation({ summary: 'Listar cursos publicados (por tenant)' })
  async listCourses(@Query() query: ListAcademyQueryDto) {
    const tenantId = await this.academy.resolveTenantId(query.tenant);
    return this.academy.listPublic(tenantId, query);
  }
}
