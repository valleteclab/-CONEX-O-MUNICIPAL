import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IbgeCity } from '../../entities/ibge-city.entity';

type IbgeMunicipioResponse = {
  id: number;
  nome: string;
  microrregiao?: {
    mesorregiao?: {
      UF?: {
        sigla?: string;
      };
    };
  };
};

@Injectable()
export class IbgeCityService {
  private readonly logger = new Logger(IbgeCityService.name);

  constructor(
    @InjectRepository(IbgeCity)
    private readonly cities: Repository<IbgeCity>,
  ) {}

  async search(query?: string, uf?: string): Promise<IbgeCity[]> {
    const normalizedQuery = this.normalize(query ?? '');
    const normalizedUf = (uf ?? '').trim().toUpperCase();

    let rows = await this.queryLocal(normalizedQuery, normalizedUf);
    if (rows.length > 0) {
      return rows;
    }

    await this.syncFromIbge(normalizedUf || undefined);
    rows = await this.queryLocal(normalizedQuery, normalizedUf);
    return rows;
  }

  async findByCode(code: string): Promise<IbgeCity | null> {
    return this.cities.findOne({ where: { code: code.trim() } });
  }

  private async queryLocal(query: string, uf: string): Promise<IbgeCity[]> {
    const qb = this.cities.createQueryBuilder('city').orderBy('city.state', 'ASC').addOrderBy('city.name', 'ASC').take(30);

    if (uf) {
      qb.andWhere('city.state = :state', { state: uf });
    }
    if (query) {
      qb.andWhere('(city.normalized_name LIKE :q OR city.code LIKE :code)', {
        q: `%${query}%`,
        code: `${query}%`,
      });
    }

    return qb.getMany();
  }

  private async syncFromIbge(uf?: string): Promise<void> {
    const url = uf
      ? `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios`
      : 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios';

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        this.logger.warn(`IBGE ${response.status} ao sincronizar municípios (${uf ?? 'todos'})`);
        return;
      }
      const payload = (await response.json()) as IbgeMunicipioResponse[];
      const entities = payload
        .map((city) => {
          const state = city.microrregiao?.mesorregiao?.UF?.sigla?.trim().toUpperCase() ?? uf?.toUpperCase() ?? '';
          if (!state) {
            return null;
          }
          return this.cities.create({
            code: String(city.id),
            name: city.nome.trim(),
            normalizedName: this.normalize(city.nome),
            state,
          });
        })
        .filter((value): value is IbgeCity => Boolean(value));

      if (entities.length === 0) {
        return;
      }

      await this.cities.upsert(entities, ['code']);
    } catch (error) {
      this.logger.warn(`Falha ao sincronizar cidades do IBGE: ${(error as Error).message}`);
    }
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
