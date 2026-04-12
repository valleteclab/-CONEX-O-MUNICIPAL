import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductXmlImports1730000017000 implements MigrationInterface {
  name = 'ProductXmlImports1730000017000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "erp_products"
      ADD COLUMN "supplier_code" varchar(80)
    `);

    await queryRunner.query(`
      CREATE TABLE "erp_product_xml_imports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "business_id" uuid NOT NULL,
        "supplier_party_id" uuid,
        "purchase_order_id" uuid,
        "access_key" varchar(44) NOT NULL,
        "invoice_number" varchar(32),
        "invoice_series" varchar(16),
        "issued_at" timestamptz,
        "supplier_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "summary" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "status" varchar(24) NOT NULL DEFAULT 'uploaded',
        "xml_hash" varchar(64) NOT NULL,
        "source_xml" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_erp_product_xml_imports" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_erp_product_xml_imports_business_access_key" UNIQUE ("business_id", "access_key"),
        CONSTRAINT "FK_erp_product_xml_imports_business" FOREIGN KEY ("business_id") REFERENCES "erp_businesses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_erp_product_xml_imports_supplier_party" FOREIGN KEY ("supplier_party_id") REFERENCES "erp_parties"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_erp_product_xml_imports_purchase_order" FOREIGN KEY ("purchase_order_id") REFERENCES "erp_purchase_orders"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "erp_product_xml_import_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "import_id" uuid NOT NULL,
        "line_number" int NOT NULL,
        "supplier_code" varchar(80),
        "barcode" varchar(32),
        "name" varchar(500) NOT NULL,
        "ncm" varchar(16),
        "cest" varchar(16),
        "cfop" varchar(8),
        "origin_code" varchar(4),
        "unit" varchar(16),
        "qty" decimal(18,4) NOT NULL DEFAULT 0,
        "unit_price" decimal(18,4) NOT NULL DEFAULT 0,
        "total_price" decimal(18,4) NOT NULL DEFAULT 0,
        "suggested_product_id" uuid,
        "match_meta" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "action" varchar(16),
        "selected_product_id" uuid,
        "draft_product" jsonb NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT "PK_erp_product_xml_import_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_erp_product_xml_import_items_import" FOREIGN KEY ("import_id") REFERENCES "erp_product_xml_imports"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_erp_product_xml_import_items_suggested_product" FOREIGN KEY ("suggested_product_id") REFERENCES "erp_products"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_erp_product_xml_import_items_selected_product" FOREIGN KEY ("selected_product_id") REFERENCES "erp_products"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_erp_product_xml_imports_business_id"
      ON "erp_product_xml_imports" ("business_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_erp_product_xml_import_items_import_id"
      ON "erp_product_xml_import_items" ("import_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_erp_product_xml_import_items_import_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_erp_product_xml_imports_business_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "erp_product_xml_import_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "erp_product_xml_imports"`);
    await queryRunner.query(`
      ALTER TABLE "erp_products"
      DROP COLUMN "supplier_code"
    `);
  }
}
