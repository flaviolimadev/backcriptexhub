import { Controller, Get, Param } from '@nestjs/common';
import { PrcingHistoryService } from './prcingHistory.service';

@Controller('prcing-history')
export class PrcingHistoryController {
    constructor(private readonly prcingHistoryService: PrcingHistoryService) {}

    // 🔥 Rota para buscar todo o histórico de preços
    @Get()
    async getAllHistory() {
        return await this.prcingHistoryService.getAllHistory();
    }

    // 🔥 Rota para buscar o histórico de um ativo específico em uma corretora
    @Get(':ativoId/:exageId')
    async getHistoryByAssetAndExchange(
        @Param('ativoId') ativoId: number,
        @Param('exageId') exageId: number,
    ) {
        return await this.prcingHistoryService.getHistoryByAssetAndExchange(ativoId, exageId);
    }
}
