export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    username: process.env.DATABASE_USER ?? 'conexao',
    password: process.env.DATABASE_PASSWORD ?? 'conexao_dev',
    database: process.env.DATABASE_NAME ?? 'conexao_municipal',
    ssl: process.env.DATABASE_SSL === 'true',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-me',
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpiresDays: parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS ?? '7', 10),
  },
  tenant: {
    defaultSlug: process.env.DEFAULT_TENANT_SLUG ?? 'luis-eduardo-magalhaes',
  },
});
