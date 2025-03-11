import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Curso } from './entities/curso.entity';
import { CursoService } from './curso.service';
import { CursoController } from './curso.controller';
import { ModuloModule } from '../modulos/modulo.module'; // 🔥 Importando o ModuloModule
import { Modulo } from '../modulos/entities/modulo.entity'; // 🔥 Certifique-se de importar corretamente
import { Aula } from '../aulas/entities/aula.entity';
import { Comentario } from '../comentarios/entities/comentario.entity';
import { AcoesAula } from '../acoes_aula/entities/acoes_aula.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([Curso, Modulo, Aula, Comentario, AcoesAula]),
    ModuloModule, // 🔥 Adicionando Modulo aqui
  ],
  providers: [CursoService],
  controllers: [CursoController],
  exports: [CursoService], // 🔥 Caso outro módulo precise usar esse serviço
})
export class CursoModule {}
