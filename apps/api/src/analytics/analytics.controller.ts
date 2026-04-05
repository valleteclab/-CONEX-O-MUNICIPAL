import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentTenantId } from '../common/decorators/current-tenant-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

/** SDD §6.5 — Painel de inteligência (KPIs agregados por tenant; IA em fases futuras). */
@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard')
  @Roles('manager', 'admin')
  @ApiOperation({ summary: 'Dashboard completo (gestor/admin do tenant)' })
  async dashboard(@CurrentTenantId() tenantId: string) {
    return this.analytics.getDashboard(tenantId);
  }

  @Get('businesses/stats')
  @Roles('manager', 'admin')
  @ApiOperation({ summary: 'Estatísticas de negócios (diretório + ERP)' })
  async businessesStats(@CurrentTenantId() tenantId: string) {
    return this.analytics.getBusinessesStats(tenantId);
  }

  @Get('quotations/stats')
  @Roles('manager', 'admin')
  @ApiOperation({ summary: 'Estatísticas de cotações' })
  async quotationsStats(@CurrentTenantId() tenantId: string) {
    return this.analytics.getQuotationsStats(tenantId);
  }

  @Get('academy/stats')
  @Roles('manager', 'admin')
  @ApiOperation({ summary: 'Estatísticas da academia' })
  async academyStats(@CurrentTenantId() tenantId: string) {
    return this.analytics.getAcademyStats(tenantId);
  }

  @Get('sectors/analysis')
  @Roles('manager', 'admin')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  @ApiOperation({ summary: 'Análise setorial (IA) — planejado' })
  sectorsAnalysis() {
    return {
      status: 'not_implemented',
      message:
        'Análise setorial com IA será integrada conforme SDD §6.5 e §7.',
    };
  }

  @Get('trends')
  @Roles('manager', 'admin')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  @ApiOperation({ summary: 'Tendências e predições (IA) — planejado' })
  trends() {
    return {
      status: 'not_implemented',
      message: 'Séries temporais e predições — fase futura.',
    };
  }

  @Get('reports/generate')
  @Roles('manager', 'admin')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  @ApiOperation({ summary: 'Relatório PDF (IA) — planejado' })
  reportsGenerate() {
    return {
      status: 'not_implemented',
      message: 'Geração de relatórios narrativos — fase futura.',
    };
  }

  @Get('heatmap')
  @Roles('manager', 'admin')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  @ApiOperation({ summary: 'Mapa de calor de demanda — planejado' })
  heatmap() {
    return {
      status: 'not_implemented',
      message: 'Agregação geoespacial de demanda — fase futura.',
    };
  }
}
