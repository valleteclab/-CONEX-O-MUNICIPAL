-- Conexão Municipal — schema public

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(64) NOT NULL UNIQUE,
  price_monthly DECIMAL(12, 2) DEFAULT 0,
  features JSONB DEFAULT '{}',
  max_users INT,
  max_businesses INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  domain VARCHAR(255),
  state CHAR(2),
  city VARCHAR(120),
  logo_url TEXT,
  primary_color VARCHAR(16),
  secondary_color VARCHAR(16),
  plan_id UUID REFERENCES plans (id),
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(32),
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(32) NOT NULL DEFAULT 'citizen',
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL DEFAULT 'citizen',
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant ON user_tenants (tenant_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id);

-- Diretório público (vitrine / perfil) — independente do núcleo ERP nesta fase
CREATE TABLE IF NOT EXISTS directory_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  slug VARCHAR(120) NOT NULL,
  trade_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  modo VARCHAR(16) NOT NULL DEFAULT 'perfil',
  owner_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, slug),
  CONSTRAINT chk_directory_modo CHECK (modo IN ('perfil', 'loja'))
);
CREATE INDEX IF NOT EXISTS idx_directory_tenant ON directory_listings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_directory_tenant_pub ON directory_listings (tenant_id, is_published);

-- ========== ERP Onda A (isolamento: tenant_id + business_id; SDD §5.4 / §6.7) ==========

CREATE TABLE IF NOT EXISTS erp_businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  trade_name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255),
  document VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_erp_businesses_tenant ON erp_businesses (tenant_id);

CREATE TABLE IF NOT EXISTS erp_business_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES erp_businesses (id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL DEFAULT 'empresa_owner',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, business_id)
);
CREATE INDEX IF NOT EXISTS idx_erp_business_users_user ON erp_business_users (user_id);

CREATE TABLE IF NOT EXISTS erp_parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES erp_businesses (id) ON DELETE CASCADE,
  type VARCHAR(16) NOT NULL,
  name VARCHAR(255) NOT NULL,
  document VARCHAR(20),
  address JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_erp_parties_business_doc ON erp_parties (business_id, document);

CREATE TABLE IF NOT EXISTS erp_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES erp_businesses (id) ON DELETE CASCADE,
  sku VARCHAR(80) NOT NULL,
  name VARCHAR(500) NOT NULL,
  ncm VARCHAR(16),
  cfop_default VARCHAR(8),
  unit VARCHAR(16) DEFAULT 'UN',
  cost DECIMAL(18,4) DEFAULT 0,
  price DECIMAL(18,4) DEFAULT 0,
  min_stock DECIMAL(18,4) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (business_id, sku)
);

CREATE TABLE IF NOT EXISTS erp_stock_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES erp_businesses (id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS erp_stock_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES erp_businesses (id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES erp_products (id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES erp_stock_locations (id) ON DELETE CASCADE,
  quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (business_id, product_id, location_id)
);

CREATE TABLE IF NOT EXISTS erp_stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES erp_businesses (id) ON DELETE CASCADE,
  type VARCHAR(16) NOT NULL,
  product_id UUID NOT NULL REFERENCES erp_products (id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES erp_stock_locations (id) ON DELETE CASCADE,
  quantity DECIMAL(18,4) NOT NULL,
  ref_type VARCHAR(32),
  ref_id UUID,
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_erp_stock_mov_prod_created ON erp_stock_movements (product_id, created_at);

CREATE TABLE IF NOT EXISTS erp_sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES erp_businesses (id) ON DELETE CASCADE,
  party_id UUID REFERENCES erp_parties (id) ON DELETE SET NULL,
  status VARCHAR(24) DEFAULT 'draft',
  total_amount DECIMAL(18,4) DEFAULT 0,
  note TEXT,
  source VARCHAR(32) DEFAULT 'erp',
  portal_request_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- Origem típica: erp (manual), portal_diretorio (vitrine / orçamento no diretório), portal_cotacoes (central de cotações).
-- Bancos já criados antes desta coluna: ALTER TABLE erp_sales_orders ADD COLUMN IF NOT EXISTS source VARCHAR(32) DEFAULT 'erp'; ADD COLUMN IF NOT EXISTS portal_request_id UUID;

CREATE TABLE IF NOT EXISTS erp_sales_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES erp_sales_orders (id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES erp_products (id),
  qty DECIMAL(18,4) NOT NULL,
  unit_price DECIMAL(18,4) NOT NULL
);

CREATE TABLE IF NOT EXISTS erp_purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES erp_businesses (id) ON DELETE CASCADE,
  supplier_party_id UUID NOT NULL REFERENCES erp_parties (id),
  status VARCHAR(24) DEFAULT 'draft',
  total_amount DECIMAL(18,4) DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS erp_purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES erp_purchase_orders (id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES erp_products (id),
  qty DECIMAL(18,4) NOT NULL,
  unit_price DECIMAL(18,4) NOT NULL
);

CREATE TABLE IF NOT EXISTS erp_accounts_receivable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES erp_businesses (id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES erp_parties (id),
  due_date DATE NOT NULL,
  amount DECIMAL(18,4) NOT NULL,
  status VARCHAR(16) DEFAULT 'open',
  link_ref VARCHAR(32),
  link_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS erp_accounts_payable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES erp_businesses (id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES erp_parties (id),
  due_date DATE NOT NULL,
  amount DECIMAL(18,4) NOT NULL,
  status VARCHAR(16) DEFAULT 'open',
  link_ref VARCHAR(32),
  link_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS erp_cash_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES erp_businesses (id) ON DELETE CASCADE,
  type VARCHAR(8) NOT NULL,
  amount DECIMAL(18,4) NOT NULL,
  category VARCHAR(80) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO plans (name, slug, price_monthly, max_users, max_businesses)
VALUES ('Municipal Patrocinado', 'municipal-sponsored', 0, NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tenants (name, slug, city, state, plan_id, is_active)
SELECT 'Luís Eduardo Magalhães', 'luis-eduardo-magalhaes', 'Luís Eduardo Magalhães', 'BA', p.id, true
FROM plans p WHERE p.slug = 'municipal-sponsored'
ON CONFLICT (slug) DO NOTHING;

-- Cotações (solicitações públicas por tenant)
CREATE TABLE IF NOT EXISTS quotation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_quotation_status CHECK (status IN ('open','in_progress','closed','cancelled'))
);
CREATE INDEX IF NOT EXISTS idx_quotation_tenant ON quotation_requests (tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotation_created ON quotation_requests (created_at DESC);

-- Academia (catálogo de cursos por tenant)
CREATE TABLE IF NOT EXISTS academy_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  duration_minutes INT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_academy_tenant ON academy_courses (tenant_id);

-- Usuário e dados de demo (senha: Demo1234)
INSERT INTO users (email, password_hash, full_name, role)
VALUES (
  'mei@demo.local',
  '$2b$12$8VmeAeBOTzppiyDNJkE4FuDN3FeXyn0PoDwFQoKrvCPrGt30zfO8m',
  'MEI Demo',
  'mei'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_tenants (user_id, tenant_id, role, is_active)
SELECT u.id, t.id, 'mei', true
FROM users u
CROSS JOIN tenants t
WHERE u.email = 'mei@demo.local' AND t.slug = 'luis-eduardo-magalhaes'
ON CONFLICT (user_id, tenant_id) DO NOTHING;

INSERT INTO directory_listings (tenant_id, slug, trade_name, description, category, modo, owner_user_id, is_published)
SELECT t.id, 'padaria-central', 'Padaria Central', 'Pães artesanais e doces regionais. Atendimento de segunda a sábado.', 'Alimentação', 'loja', u.id, true
FROM tenants t
JOIN users u ON u.email = 'mei@demo.local'
WHERE t.slug = 'luis-eduardo-magalhaes'
AND NOT EXISTS (SELECT 1 FROM directory_listings d WHERE d.tenant_id = t.id AND d.slug = 'padaria-central');

INSERT INTO directory_listings (tenant_id, slug, trade_name, description, category, modo, owner_user_id, is_published)
SELECT t.id, 'eletrica-silva', 'Elétrica Silva', 'Instalações e manutenção elétrica residencial e comercial.', 'Serviços', 'perfil', u.id, true
FROM tenants t
JOIN users u ON u.email = 'mei@demo.local'
WHERE t.slug = 'luis-eduardo-magalhaes'
AND NOT EXISTS (SELECT 1 FROM directory_listings d WHERE d.tenant_id = t.id AND d.slug = 'eletrica-silva');

INSERT INTO directory_listings (tenant_id, slug, trade_name, description, category, modo, owner_user_id, is_published)
SELECT t.id, 'tech-solucoes', 'Tech Soluções', 'Suporte em computadores, redes e pequenos sistemas.', 'Tecnologia', 'perfil', u.id, true
FROM tenants t
JOIN users u ON u.email = 'mei@demo.local'
WHERE t.slug = 'luis-eduardo-magalhaes'
AND NOT EXISTS (SELECT 1 FROM directory_listings d WHERE d.tenant_id = t.id AND d.slug = 'tech-solucoes');

INSERT INTO quotation_requests (tenant_id, requester_user_id, title, description, status)
SELECT t.id, u.id, 'Instalação de ar-condicionado', 'Loja comercial ~90 m², preciso orçamento de instalação e materiais.', 'open'
FROM tenants t
JOIN users u ON u.email = 'mei@demo.local'
WHERE t.slug = 'luis-eduardo-magalhaes'
AND NOT EXISTS (
  SELECT 1 FROM quotation_requests q WHERE q.tenant_id = t.id AND q.title = 'Instalação de ar-condicionado'
);

INSERT INTO academy_courses (tenant_id, title, summary, duration_minutes, is_published)
SELECT t.id, 'Abertura de MEI', 'Passo a passo, DAS e obrigações básicas para quem está começando.', 120, true
FROM tenants t WHERE t.slug = 'luis-eduardo-magalhaes'
AND NOT EXISTS (SELECT 1 FROM academy_courses c WHERE c.tenant_id = t.id AND c.title = 'Abertura de MEI');

INSERT INTO academy_courses (tenant_id, title, summary, duration_minutes, is_published)
SELECT t.id, 'Precificação e margem', 'Como formar preço de venda e acompanhar custos.', 90, true
FROM tenants t WHERE t.slug = 'luis-eduardo-magalhaes'
AND NOT EXISTS (SELECT 1 FROM academy_courses c WHERE c.tenant_id = t.id AND c.title = 'Precificação e margem');

INSERT INTO academy_courses (tenant_id, title, summary, duration_minutes, is_published)
SELECT t.id, 'Atendimento ao cliente', 'Boas práticas presenciais e digitais para fidelizar.', 60, true
FROM tenants t WHERE t.slug = 'luis-eduardo-magalhaes'
AND NOT EXISTS (SELECT 1 FROM academy_courses c WHERE c.tenant_id = t.id AND c.title = 'Atendimento ao cliente');
