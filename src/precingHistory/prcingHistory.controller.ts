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

    // 🔥 Rota para buscar os 50 últimos históricos de um ativo em duas exchanges diferentes pelo nome
    @Get(':ativoName/:exageName1/:exageName2')
    async getComparisonHistory(
        @Param('ativoName') ativoName: string,
        @Param('exageName1') exageName1: string,
        @Param('exageName2') exageName2: string,
    ) {
        return await this.prcingHistoryService.getComparisonHistory(ativoName, exageName1, exageName2);
    }
}
