# Conexão Municipal

Monorepo com `apps/web` (Next.js), `apps/api` (NestJS) e `packages/shared`.

## Produto

O projeto está organizado em dois pilares:

- `Operação do negócio`: ERP para MEI e pequenas empresas, com comércio, serviços e fiscal.
- `Geração de negócios`: diretório, presença digital, marketplace local e oportunidades.

## Documentação

- [SDD-ConexaoMunicipal.md](./SDD-ConexaoMunicipal.md) — visão ampla da plataforma e arquitetura.
- [docs/SPEC-ATUAL.md](./docs/SPEC-ATUAL.md) — leitura atual do produto e do que já está implementado.
- [docs/GO-LIVE.md](./docs/GO-LIVE.md) — escopo operacional de liberação.

## Comandos

```bash
npm install
npm run docker:up
cp apps/api/.env.example apps/api/.env
npm run dev:api
npm run dev:web
```

- PostgreSQL: `localhost:5432` user `conexao` / `conexao_dev` database `conexao_municipal`
- API: `http://localhost:3001/api/v1/health`
- Swagger: `http://localhost:3001/docs`
