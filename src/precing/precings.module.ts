import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Prcing } from "./entities/prcing.entity";
import { PrecingsService } from "./precings.service";
import { PrecingsController } from "./precings.controller";
import { Ativo } from '../ativos/entities/ativo.entity'; // 🔥 Import correto
import { Exage } from '../exages/exage.entity'; // 🔥 Import correto

@Module({
  imports: [TypeOrmModule.forFeature([Prcing, Ativo, Exage])],
  controllers: [PrecingsController],
  providers: [PrecingsService],
  exports: [PrecingsService],
})
export class PrecingsModule {}
