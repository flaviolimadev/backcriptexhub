import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrcingHistory } from './prcingHistory.entity';
import { PrcingHistoryService } from './prcingHistory.service';
import { PrcingHistoryController } from './prcingHistory.controller';

@Module({
    imports: [TypeOrmModule.forFeature([PrcingHistory])],
    providers: [PrcingHistoryService],
    controllers: [PrcingHistoryController],
    exports: [TypeOrmModule, PrcingHistoryService], // 🔥 Exportando para uso em outros módulos
})
export class PrcingHistoryModule {}
