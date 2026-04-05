import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import {
  PasswordResetToken,
  Plan,
  RefreshToken,
  Tenant,
  User,
  UserTenant,
} from './entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DATABASE_HOST ?? 'localhost',
        port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
        username: process.env.DATABASE_USER ?? 'conexao',
        password: process.env.DATABASE_PASSWORD ?? 'conexao_dev',
        database: process.env.DATABASE_NAME ?? 'conexao_municipal',
        entities: [
          Plan,
          Tenant,
          User,
          UserTenant,
          RefreshToken,
          PasswordResetToken,
        ],
        synchronize: process.env.TYPEORM_SYNC === 'true',
        logging: process.env.NODE_ENV !== 'production',
      }),
    }),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
