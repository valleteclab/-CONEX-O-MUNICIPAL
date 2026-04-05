# Conexão Municipal

Monorepo: `apps/web` (Next.js), `apps/api` (NestJS), `packages/shared`.

## Documentação

- [SDD-ConexaoMunicipal.md](./SDD-ConexaoMunicipal.md) — **v2.0** (inclui **ERP empresarial nativo** para MEI/pequenas empresas: §5.4, §6.7, ondas A/B/C)

## Comandos

```bash
npm install
npm run docker:up
cp apps/api/.env.example apps/api/.env   # ajuste JWT_SECRET
npm run dev:api
npm run dev:web
```

- PostgreSQL: `localhost:5432` user `conexao` / `conexao_dev` database `conexao_municipal`.
- API: `http://localhost:3001/api/v1/health` — Swagger: `http://localhost:3001/docs`
- Auth: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `GET /api/v1/auth/me` (Bearer)
