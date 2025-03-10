import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcoesComentario } from './entities/acoes_comentario.entity';
import { AcoesComentarioService } from './acoes_comentario.service';
import { AcoesComentarioController } from './acoes_comentario.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AcoesComentario])],
  providers: [AcoesComentarioService],
  controllers: [AcoesComentarioController],
})
export class AcoesComentarioModule {}
