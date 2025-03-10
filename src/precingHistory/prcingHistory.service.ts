import { Injectable, NotFoundException  } from '@nestjs/common';
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

        @InjectRepository(Ativo)
        private readonly ativoRepository: Repository<Ativo>, // 🔥 Correção: Injetando o repositório de ativos

        @InjectRepository(Exage)
        private readonly exageRepository: Repository<Exage>, // 🔥 Correção: Injetando o repositório de exchanges
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

    // 🔥 Buscar os 50 últimos históricos de um ativo em duas exchanges diferentes pelo nome
    async getComparisonHistory(ativoName: string, exageName1: string, exageName2: string): Promise<any> {
        // 🔥 Buscar ativo pelo nome
        const ativo = await this.ativoRepository.findOne({ where: { name: ativoName } });
        if (!ativo) throw new NotFoundException(`Ativo "${ativoName}" não encontrado.`);

        // 🔥 Buscar exchanges pelo nome simultaneamente
        const [exage1, exage2] = await Promise.all([
            this.exageRepository.findOne({ where: { name: exageName1 } }),
            this.exageRepository.findOne({ where: { name: exageName2 } }),
        ]);

        if (!exage1) throw new NotFoundException(`Exchange "${exageName1}" não encontrada.`);
        if (!exage2) throw new NotFoundException(`Exchange "${exageName2}" não encontrada.`);

        // 🔥 Buscar histórico das duas exchanges simultaneamente para reduzir tempo de resposta
        const [history1, history2] = await Promise.all([
            this.prcingHistoryRepository.find({
                where: { ativo: { id: ativo.id }, exage: { id: exage1.id } },
                order: { timestamp: 'DESC' },
                take: 50, // 🔥 Limita a 50 registros
            }),
            this.prcingHistoryRepository.find({
                where: { ativo: { id: ativo.id }, exage: { id: exage2.id } },
                order: { timestamp: 'DESC' },
                take: 50, // 🔥 Limita a 50 registros
            }),
        ]);

        return {
            ativo: ativoName,
            exchange_1: exageName1,
            exchange_2: exageName2,
            history_1: history1,
            history_2: history2,
        };
    }
}
