import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aula } from './entities/aula.entity';
import { Modulo } from '../modulos/entities/modulo.entity';
import { AulaService } from './aula.service';
import { AulaController } from './aula.controller';
import { Comentario } from '../comentarios/entities/comentario.entity'; // ✅ Importação do Comentario
import { AcoesAula } from '../acoes_aula/entities/acoes_aula.entity';
import { Curso } from '../cursos/entities/curso.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Aula, Comentario, AcoesAula, Modulo, Curso]), // ✅ Certifique-se de incluir Comentario
  ],
  controllers: [AulaController],
  providers: [AulaService],
})
export class AulaModule {}
