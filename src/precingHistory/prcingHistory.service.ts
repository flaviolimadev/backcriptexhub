import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrcingHistory } from './prcingHistory.entity';
import { Ativo } from '../ativos/entities/ativo.entity';
import { Exage } from '../exages/exage.entity';

@Injectable()
export class PrcingHistoryService {
    constructor(
        @InjectRepository(PrcingHistory)
        private readonly prcingHistoryRepository: Repository<PrcingHistory>,
    ) {}

    // 🔥 Buscar todo o histórico de preços
    async getAllHistory(): Promise<PrcingHistory[]> {
        return await this.prcingHistoryRepository.find({ relations: ['ativo', 'exage'] });
    }

    // 🔥 Buscar histórico para um ativo específico em uma corretora específica
    async getHistoryByAssetAndExchange(ativoId: number, exageId: number): Promise<PrcingHistory[]> {
        return await this.prcingHistoryRepository.find({
            where: { ativo: { id: ativoId }, exage: { id: exageId } },
            order: { timestamp: 'DESC' }, // 🔥 Ordenando por mais recente
        });
    }

    // 🔥 Salvar histórico de preços
    async savePriceHistory(ativo: Ativo, exage: Exage, precing: number): Promise<void> {
        const newHistory = this.prcingHistoryRepository.create({
            ativo,
            exage,
            precing,
            timestamp: Date.now(),
        });

        await this.prcingHistoryRepository.save(newHistory);
    }
}
