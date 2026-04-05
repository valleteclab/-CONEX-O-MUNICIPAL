import { ValidationPipe } from '@nestjs/common';
import './types/express';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
      'API REST — Auth, ERP Onda A (cadastros, estoque, pedidos, financeiro; SDD v2.0 §6.7). Use header X-Business-Id nas rotas /erp/* exceto /erp/businesses.',
    )
    .setVersion('0.3.0')
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
