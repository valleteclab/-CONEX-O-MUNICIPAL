import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductRepositioning1730000014000 implements MigrationInterface {
  name = 'ProductRepositioning1730000014000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS erp_quotes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        business_id uuid NOT NULL REFERENCES erp_businesses(id) ON DELETE CASCADE,
        party_id uuid REFERENCES erp_parties(id) ON DELETE SET NULL,
        title varchar(255) NOT NULL,
        status varchar(24) NOT NULL DEFAULT 'draft',
        source varchar(32) NOT NULL DEFAULT 'erp',
        valid_until date,
        total_amount decimal(18,4) NOT NULL DEFAULT 0,
        note text,
        converted_sales_order_id uuid REFERENCES erp_sales_orders(id) ON DELETE SET NULL,
        converted_service_order_id uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS erp_quote_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id uuid NOT NULL REFERENCES erp_quotes(id) ON DELETE CASCADE,
        product_id uuid NOT NULL REFERENCES erp_products(id) ON DELETE RESTRICT,
        qty decimal(18,4) NOT NULL,
        unit_price decimal(18,4) NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS erp_service_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        business_id uuid NOT NULL REFERENCES erp_businesses(id) ON DELETE CASCADE,
        party_id uuid REFERENCES erp_parties(id) ON DELETE SET NULL,
        quote_id uuid REFERENCES erp_quotes(id) ON DELETE SET NULL,
        title varchar(255) NOT NULL,
        status varchar(24) NOT NULL DEFAULT 'draft',
        description text,
        scheduled_for timestamptz,
        assigned_to varchar(160),
        total_amount decimal(18,4) NOT NULL DEFAULT 0,
        note text,
        stock_posted_at timestamptz,
        receivable_posted_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      ALTER TABLE erp_quotes
      ADD CONSTRAINT IF NOT EXISTS fk_erp_quotes_converted_service_order
      FOREIGN KEY (converted_service_order_id)
      REFERENCES erp_service_orders(id)
      ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS erp_service_order_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_order_id uuid NOT NULL REFERENCES erp_service_orders(id) ON DELETE CASCADE,
        product_id uuid NOT NULL REFERENCES erp_products(id) ON DELETE RESTRICT,
        qty decimal(18,4) NOT NULL,
        unit_price decimal(18,4) NOT NULL
      );
    `);

    await queryRunner.query(`
      ALTER TABLE directory_listings
        ADD COLUMN IF NOT EXISTS public_headline varchar(180),
        ADD COLUMN IF NOT EXISTS contact_info jsonb NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS services jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS offerings jsonb NOT NULL DEFAULT '[]'::jsonb;
    `);

    await queryRunner.query(`
      ALTER TABLE quotation_requests
        ADD COLUMN IF NOT EXISTS kind varchar(32) NOT NULL DEFAULT 'private_market',
        ADD COLUMN IF NOT EXISTS category varchar(120),
        ADD COLUMN IF NOT EXISTS desired_date date,
        ADD COLUMN IF NOT EXISTS requester_business_id uuid,
        ADD COLUMN IF NOT EXISTS responses_count integer NOT NULL DEFAULT 0;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS quotation_responses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        quotation_request_id uuid NOT NULL REFERENCES quotation_requests(id) ON DELETE CASCADE,
        responder_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        responder_business_id uuid,
        message text NOT NULL,
        status varchar(24) NOT NULL DEFAULT 'submitted',
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_erp_quotes_business ON erp_quotes(business_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_erp_service_orders_business ON erp_service_orders(business_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_quotation_requests_kind ON quotation_requests(kind);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_quotation_responses_request ON quotation_responses(quotation_request_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS quotation_responses;`);

    await queryRunner.query(`
      ALTER TABLE quotation_requests
        DROP COLUMN IF EXISTS responses_count,
        DROP COLUMN IF EXISTS requester_business_id,
        DROP COLUMN IF EXISTS desired_date,
        DROP COLUMN IF EXISTS category,
        DROP COLUMN IF EXISTS kind;
    `);

    await queryRunner.query(`
      ALTER TABLE directory_listings
        DROP COLUMN IF EXISTS offerings,
        DROP COLUMN IF EXISTS services,
        DROP COLUMN IF EXISTS contact_info,
        DROP COLUMN IF EXISTS public_headline;
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS erp_service_order_items;`);
    await queryRunner.query(`DROP TABLE IF EXISTS erp_quote_items;`);
    await queryRunner.query(`DROP TABLE IF EXISTS erp_service_orders;`);
    await queryRunner.query(`DROP TABLE IF EXISTS erp_quotes;`);
  }
}
