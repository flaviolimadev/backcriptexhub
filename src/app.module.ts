import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ArbitrageModule } from './arbitrage/arbitrage.module';
import { AtivosModule } from './ativos/ativos.module';
import { ExagesModule } from "./exages/exages.module";
import { PrecingsModule } from "./precing/precings.module";


@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'dpg-cv5kt7t2ng1s73dfqssg-a',
      port: 5432,
      username: 'banco_criptexv3_user',
      password: 'HV66F2rCmG2gYJxrti1xEOCPTzXsaTgc',
      database: 'banco_criptexv3',
      autoLoadEntities: true,
      synchronize: true, // ⚠️ Apenas para desenvolvimento, remova em produção
    }),
    UsersModule,
    AuthModule,
    ArbitrageModule,
    AtivosModule,
    ExagesModule,
    PrecingsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
