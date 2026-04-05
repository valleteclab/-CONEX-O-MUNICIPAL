/// <reference path="./types/express.d.ts" />
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

function normalizeCorsOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /** Browsers send Origin without trailing slash; env often has one — normalize so CORS matches. */
  const corsOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((s) => normalizeCorsOrigin(s))
    .filter(Boolean);
  app.enableCors({
    origin:
      corsOrigins?.length ?
        (origin, callback) => {
          if (!origin) {
            callback(null, true);
            return;
          }
          const requestOrigin = normalizeCorsOrigin(origin);
          const allowed = corsOrigins.some((o) => o === requestOrigin);
          callback(null, allowed);
        }
      : true,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Conexão Municipal API')
    .setDescription(
      'API REST — Auth, cadastro de perfil (PATCH /users/me), diretório público (GET/POST/PATCH /businesses), ERP Onda A (SDD §6.7). Header X-Business-Id nas rotas /erp/* exceto listar/criar negócios ERP.',
    )
    .setVersion('0.4.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen(port);
  console.error(
    `[api] listening on http://localhost:${port} — Swagger: http://localhost:${port}/docs`,
  );
}

bootstrap();
