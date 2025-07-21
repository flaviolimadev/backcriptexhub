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
import { EstrategiaModule } from './estrategias/estrategia.module';
import { CursoModule } from './cursos/curso.module';
import { ModuloModule } from './modulos/modulo.module';
import { AulaModule } from './aulas/aula.module';
import { ComentarioModule } from './comentarios/comentario.module';
import { AcoesAulaModule } from './acoes_aula/acoes_aula.module';
import { AcoesComentarioModule } from './acoes_comentario/acoes_comentario.module';
import { PrcingHistoryModule } from './precingHistory/prcingHistory.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: 'postgresql://criptexhub_user:PDhAK3ovOUBNBBhcau3LcAxIIcK6zLsf@dpg-d1v665ali9vc73bdc1t0-a.oregon-postgres.render.com/criptexhub',
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
    PrecingsModule,
    EstrategiaModule,
    CursoModule,
    ModuloModule,
    AulaModule,
    ComentarioModule,
    AcoesAulaModule,
    AcoesComentarioModule,
    PrcingHistoryModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
