import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcoesAula } from './entities/acoes_aula.entity';
import { AcoesAulaService } from './acoes_aula.service';
import { AcoesAulaController } from './acoes_aula.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AcoesAula])],
  controllers: [AcoesAulaController],
  providers: [AcoesAulaService],
})
export class AcoesAulaModule {}
