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

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: 'postgresql://banco_criptexv3_user:HV66F2rCmG2gYJxrti1xEOCPTzXsaTgc@dpg-cv5kt7t2ng1s73dfqssg-a.oregon-postgres.render.com/banco_criptexv3',
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
    AcoesComentarioModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
