import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ativo } from './entities/ativo.entity';
import { AtivosService } from './ativos.service';
import { AtivosController } from './ativos.controller';
import { AtivosSeedService } from './ativos-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Ativo])],
  controllers: [AtivosController],
  providers: [AtivosService, AtivosSeedService],
  exports: [AtivosService, TypeOrmModule],
})
export class AtivosModule {}
