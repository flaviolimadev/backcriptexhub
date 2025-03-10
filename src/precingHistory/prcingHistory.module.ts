import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrcingHistory } from './prcingHistory.entity';
import { PrcingHistoryService } from './prcingHistory.service';
import { PrcingHistoryController } from './prcingHistory.controller';
import { Ativo } from '../ativos/entities/ativo.entity'; // 🔥 Importando entidade Ativo
import { Exage } from '../exages/exage.entity'; // 🔥 Importando entidade Exage

@Module({
    imports: [
        TypeOrmModule.forFeature([PrcingHistory, Ativo, Exage]), // 🔥 Incluindo Ativo e Exage
      ],
    providers: [PrcingHistoryService],
    controllers: [PrcingHistoryController],
    exports: [TypeOrmModule, PrcingHistoryService], // 🔥 Exportando para uso em outros módulos
})
export class PrcingHistoryModule {}
