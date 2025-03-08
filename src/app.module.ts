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
import { ScheduleModule } from '@nestjs/schedule'; // 📌 Importação do módulo de agendamento

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: 'postgresql://criptexv3:2eqb37g6u3fv@db-57709.dc-sp-1.absamcloud.com/criptexv3',
      autoLoadEntities: true,
      synchronize: true,
      ssl: {
        rejectUnauthorized: false,
      },
    }),
    ScheduleModule.forRoot(), 
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
