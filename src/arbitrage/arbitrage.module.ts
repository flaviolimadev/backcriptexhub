import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // 🔥 Adicione esta importação
import { ArbitrageService } from './arbitrage.service';
import { ArbitrageController } from './arbitrage.controller';
import { AtivosModule } from '../ativos/ativos.module'; // 🔥 Importando o módulo
import { Ativo } from '../ativos/entities/ativo.entity'; // 🔥 Importando a entidade
import { Prcing  } from '../precing/entities/prcing.entity'; // 🔥 Adicionando a entidade Precing
import { Exage } from '../exages/exage.entity';
import { PrcingHistory } from '../precingHistory/prcingHistory.entity';
import { PrcingHistoryService } from '../precingHistory/prcingHistory.service';
import { PrcingHistoryModule } from '../precingHistory/prcingHistory.module'; // 🔥 IMPORTANDO O MÓDULO CORRETO



@Module({
  imports: [
    TypeOrmModule.forFeature([Ativo, Prcing , Exage, PrcingHistory]), // 🔥 Agora `TypeOrmModule` está corretamente importado
    AtivosModule,PrcingHistoryModule,
  ],
  providers: [ArbitrageService, PrcingHistoryService],
  controllers: [ArbitrageController]
})
export class ArbitrageModule {}
