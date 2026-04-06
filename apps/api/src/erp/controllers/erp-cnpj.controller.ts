import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CnpjLookupService } from '../services/cnpj-lookup.service';

@ApiTags('erp — CNPJ')
@Controller('erp/cnpj')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ErpCnpjController {
  constructor(private readonly cnpj: CnpjLookupService) {}

  @Get(':cnpj')
  @ApiOperation({
    summary:
      'Consultar dados do CNPJ na Receita (Invertexto). Requer CNPJ_API_TOKEN.',
  })
  async consultar(@Param('cnpj') cnpj: string) {
    return this.cnpj.consultarCnpj(cnpj);
  }
}
