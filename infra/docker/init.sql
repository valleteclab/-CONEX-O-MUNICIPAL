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
