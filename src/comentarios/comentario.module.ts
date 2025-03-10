import { Module } from '@nestjs/common';
import { ComentarioService } from './comentario.service';
import { ComentarioController } from './comentario.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comentario } from './entities/comentario.entity';
import { Aula } from '../aulas/entities/aula.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Comentario, Aula, User])],
  controllers: [ComentarioController],
  providers: [ComentarioService],
})
export class ComentarioModule {}
