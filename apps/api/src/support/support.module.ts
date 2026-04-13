import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../entities/user.entity';
import { ErpModule } from '../erp/erp.module';
import { ErpBusiness } from '../entities/erp-business.entity';
import { ErpFiscalDocument } from '../entities/erp-fiscal-document.entity';
import { PlatformSettingsModule } from '../platform/platform-settings.module';
import { SupportAuthController } from './support-auth.controller';
import { SupportController } from './support.controller';
import { SupportAuthService } from './support-auth.service';
import { SupportService } from './support.service';
import { SupportAuthGuard } from './guards/support-auth.guard';

@Module({
  imports: [
    ConfigModule,
    ErpModule,
    PlatformSettingsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('support.sessionSecret', 'support-dev-only-change-me'),
      }),
    }),
    TypeOrmModule.forFeature([ErpFiscalDocument, ErpBusiness, User, RefreshToken]),
  ],
  controllers: [SupportAuthController, SupportController],
  providers: [SupportAuthService, SupportService, SupportAuthGuard],
})
export class SupportModule {}
