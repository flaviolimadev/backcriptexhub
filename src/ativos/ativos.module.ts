import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ativo } from './entities/ativo.entity';
import { AtivosService } from './ativos.service';
import { AtivosController } from './ativos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Ativo])],
  controllers: [AtivosController],
  providers: [AtivosService],
  exports: [AtivosService, TypeOrmModule],
})
export class AtivosModule {}
