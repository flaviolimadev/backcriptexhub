import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Modulo } from './entities/modulo.entity';
import { Curso } from '../cursos/entities/curso.entity';
import { ModuloService } from './modulo.service';
import { ModuloController } from './modulo.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Modulo, Curso])],
  controllers: [ModuloController],
  providers: [ModuloService],
})
export class ModuloModule {}
