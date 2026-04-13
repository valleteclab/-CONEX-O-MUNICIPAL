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
    passwordResetExpiresMinutes: parseInt(
      process.env.PASSWORD_RESET_EXPIRES_MINUTES ?? '60',
      10,
    ),
    emailVerificationExpiresMinutes: parseInt(
      process.env.EMAIL_VERIFICATION_EXPIRES_MINUTES ?? '1440',
      10,
    ),
  },
  tenant: {
    defaultSlug: process.env.DEFAULT_TENANT_SLUG ?? 'luis-eduardo-magalhaes',
  },
  fiscal: {
    plugnotasApiKey:
      process.env.PLUGNOTAS_API_KEY ?? '2da392a6-79d2-4304-a8b7-959572c7e44d',
    plugnotasBaseUrl:
      process.env.PLUGNOTAS_BASE_URL ?? 'https://api.sandbox.plugnotas.com.br',
    sandbox: process.env.PLUGNOTAS_SANDBOX !== 'false',
    webhookSecret: process.env.PLUGNOTAS_WEBHOOK_SECRET ?? '',
  },
  /** Consulta CNPJ — https://api.invertexto.com (cadastro ERP) */
  cnpj: {
    apiToken: process.env.CNPJ_API_TOKEN ?? '',
    apiBaseUrl:
      process.env.CNPJ_API_BASE_URL ?? 'https://api.invertexto.com/v1/cnpj',
  },
  ai: {
    openrouterApiKey: process.env.OPENROUTER_API_KEY ?? '',
    openrouterBaseUrl:
      process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
  },
  support: {
    adminUsername: process.env.SUPPORT_ADMIN_USERNAME ?? '',
    adminPassword: process.env.SUPPORT_ADMIN_PASSWORD ?? '',
    sessionSecret:
      process.env.SUPPORT_ADMIN_SESSION_SECRET ?? 'support-dev-only-change-me',
    sessionExpires:
      process.env.SUPPORT_ADMIN_SESSION_EXPIRES ?? '8h',
  },
  integrations: {
    whatsappBaseUrl: process.env.WHATSAPP_API_BASE_URL ?? '',
    whatsappApiToken: process.env.WHATSAPP_API_TOKEN ?? '',
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    whatsappBusinessAccountId:
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? '',
  },
});
