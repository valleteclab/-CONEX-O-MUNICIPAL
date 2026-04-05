-- Schema e seeds: ver migration-baseline.sql + TypeORM (npm run migration:run -w api).
-- Este ficheiro mantém só extensões para o primeiro arranque do Postgres no Docker.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";
