import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aula } from './entities/aula.entity';
import { Modulo } from '../modulos/entities/modulo.entity';
import { AulaService } from './aula.service';
import { AulaController } from './aula.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Aula, Modulo])],
  controllers: [AulaController],
  providers: [AulaService],
})
export class AulaModule {}
