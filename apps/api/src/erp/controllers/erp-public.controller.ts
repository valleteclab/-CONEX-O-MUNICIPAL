import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicBusinessSignupDto } from '../dto/public-business-signup.dto';
import { CnpjLookupService } from '../services/cnpj-lookup.service';
import { BusinessSegmentPresetService } from '../services/business-segment-preset.service';
import { ErpPublicSignupService } from '../services/erp-public-signup.service';
import { IbgeCityService } from '../services/ibge-city.service';

@ApiTags('erp — público')
@Controller('erp/public')
export class ErpPublicController {
  constructor(
    private readonly cnpj: CnpjLookupService,
    private readonly signups: ErpPublicSignupService,
    private readonly ibgeCities: IbgeCityService,
    private readonly segmentPresets: BusinessSegmentPresetService,
  ) {}

  @Get('business-segment-presets')
  @ApiOperation({ summary: 'Listar presets oficiais de segmento para o cadastro público' })
  async listBusinessSegmentPresets() {
    return this.segmentPresets.listAll();
  }

  @Get('business-segment-presets/:key')
  @ApiOperation({ summary: 'Detalhar um preset oficial de segmento do cadastro público' })
  async findBusinessSegmentPreset(@Param('key') key: string) {
    return this.segmentPresets.findOne(key as any);
  }

  @Get('cnpj/:cnpj')
  @ApiOperation({ summary: 'Consultar dados públicos do CNPJ para pré-cadastro empresarial' })
  async consultarCnpj(@Param('cnpj') cnpj: string) {
    return this.cnpj.consultarCnpj(cnpj);
  }

  @Get('cities')
  @ApiOperation({ summary: 'Buscar cidades IBGE para autocomplete do cadastro empresarial' })
  async listCities(
    @Query('q') q?: string,
    @Query('uf') uf?: string,
  ) {
    return this.ibgeCities.search(q, uf);
  }

  @Post('business-signup')
  @ApiOperation({ summary: 'Enviar cadastro público da empresa para aprovação da plataforma' })
  async createBusinessSignup(@Body() dto: PublicBusinessSignupDto) {
    return this.signups.createSignup(dto);
  }
}
