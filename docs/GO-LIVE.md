# Go-live: escopo, operações e ERP (UI)

## 1. Escopo da liberação (v1)

**Incluído na liberação atual (funcionalidades prontas para uso com a API em produção):**

- Autenticação (login, cadastro, recuperação de senha) e contexto por tenant.
- **Diretório:** listagem e vitrine públicas; cadastro de vitrine pelo utilizador em `/dashboard/meu-negocio` sujeito a **moderação** pela plataforma.
- **Cotações** (público + área logada).
- **Academia** (catálogo, detalhe, área logada de formações).
- **Painel municipal** (`/painel`) para papéis `manager` / `admin` no tenant.
- **Moderação plataforma** (`/dashboard/plataforma`) para utilizadores com papel `super_admin` (aprovar/suspender diretório e ERP).

**Fora do escopo de “produto completo” nesta v1 (API existe; interface web ainda placeholder):**

- **ERP no browser** (`/erp` e subrotas): navegação e protótipos de ecrã; tabelas sem dados reais; PDV sem integração ao catálogo. Comunicar como roadmap ou ocultar do menu público se a expectativa for só diretório/serviços.

---

## 2. Checklist de deploy e operação

- [ ] **Base de dados:** migrations aplicadas (incl. moderação `directory_listings` / `erp_businesses` e utilizador super admin, se usar migration de plataforma).
- [ ] **API:** `JWT_*`, `DATABASE_URL`, `TYPEORM_MIGRATIONS_RUN=true` em produção, `TYPEORM_SYNC=false`.
- [ ] **CORS:** `CORS_ORIGINS` com o origin exato do front (sem barra final), alinhado ao browser.
- [ ] **Front:** `NEXT_PUBLIC_API_BASE_URL` apontando para a API pública no **build** do Next.
- [ ] **Super admin:** credenciais definidas pela equipa (conta criada por migration ou manualmente); não partilhar passwords em repositório; alterar password padrão após primeiro login.
- [ ] **Smoke tests:** `GET /api/v1/health`; login; listagem `/diretorio`; uma ação de moderação em staging antes de abrir tráfego real.

---

## 3. Roadmap da UI do ERP (quando for requisito)

Fases sugeridas para alinhar o front à API já existente:

1. **Contexto de negócio:** após login, listar negócios ERP do utilizador (`GET /erp/businesses`), persistir `businessId` selecionado (cookie/localStorage) e enviar `X-Business-Id` em todos os pedidos ERP.
2. **Cadastros operacionais:** integrar listagens reais em produtos, clientes/fornecedores, stock (substituir placeholders).
3. **Pedidos e financeiro:** ligar formulários e tabelas às rotas de vendas, compras, AR/AP/caixa.
4. **PDV:** carregar produtos via API, gravar venda conforme regras do backend (e fiscal quando existir).

Cada fase pode ser entregue independentemente desde que o guard e o tenant continuem consistentes.
