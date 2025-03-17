import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import { Ativo } from '../ativos/entities/ativo.entity'; // Importando a entidade Ativo
import { Repository, MoreThan } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Exage } from '../exages/exage.entity';
import { Prcing  } from '../precing/entities/prcing.entity'; // 🔥 Importando a entidade Precing
import { PrcingHistoryService } from '../precingHistory/prcingHistory.service';
import { PrcingHistory } from '../precingHistory/prcingHistory.entity'; // 🔥 Importando a entidade
import { HttpsProxyAgent } from 'https-proxy-agent'; // 🔥 Suporte a proxy
import { Cron } from '@nestjs/schedule';
import * as https from 'https';

dotenv.config();

// 🔥 Configuração do Proxy
const proxyAgent = new HttpsProxyAgent(`http://${process.env.PROXY_USERNAME}:${process.env.PROXY_PASSWORD}@${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`);

interface BitgetTickerResponse {
  code: string;
  msg: string;
  data: {
    symbol: string;
    last: string;
    high24h: string;
    low24h: string;
    fundingRate: string;
    change24h: string;
  }[];
}

interface BitgetContractsResponse {
  code: string;
  msg: string;
  data: {
    symbol: string;
    minTradeNum: string;
    maxTradeNum: string;
    minTradeUSDT: string;
    maxTradeUSDT: string;
  }[];
}

// 🔥 Definição dos tipos da resposta da API da Bitget
interface BitgetApiResponse<T> {
  code: string;
  msg: string;
  requestTime: number;
  data: T;
}

export interface BitgetTicker {
  symbol: string;
  last: string;
  high24h: string;
  low24h: string;
  fundingRate: string;
  change24h: string;
}

interface BinanceContractInfo {
  min_size: string;
  max_size: string;
  min_notional: string;
}

export interface BinancePrice {  // 🔥 Adicionando 'export' para tornar acessível
  pair: string;
  last_price: string;
  highest_price_24h: string;
  lowest_price_24h: string;
  funding_rate: string;
  change_24h: string;
  min_size: string;
  max_size: string;
  min_notional: string;
}

interface BinanceContract {
    symbol: string;
    filters: { filterType: string; minQty?: string; maxQty?: string; notional?: string }[];
  }

// 🔥 Configuração das credenciais da Bitget (adicione ao .env)
const BITGET_API_KEY = process.env.BITGET_API_KEY;
const BITGET_SECRET_KEY = process.env.BITGET_SECRET_KEY;
const BITGET_PASSPHRASE = process.env.BITGET_PASSPHRASE;


@Injectable()
export class ArbitrageService {

  private readonly logger = new Logger(ArbitrageService.name); // 🔥 CORREÇÃO: Logger definido

  private gateIoAPI = 'https://api.gateio.ws/api/v4/futures/usdt/tickers'; // API de preços futuros
  private gateIoContractsAPI = 'https://api.gateio.ws/api/v4/futures/usdt/contracts'; // API de contratos futuros

  private mexcAPI = 'https://contract.mexc.com/api/v1/contract/ticker'; // API de preços futuros MEXC
  private mexcContractsAPI = 'https://contract.mexc.com/api/v1/contract/detail'; // API de contratos futuros MEXC

  private readonly bitgetAPI = 'https://api.bitget.com/api/mix/v1/market/ticker?symbol=';

  private binanceFuturesAPI = 'https://fapi.binance.com/fapi/v1/ticker/24hr';
  private binanceContractsAPI = 'https://fapi.binance.com/fapi/v1/exchangeInfo';

  // 🔥 Método para assinar a requisição
  private generateSignature(timestamp: string): string {
    if (!BITGET_SECRET_KEY) {
      throw new Error('BITGET_SECRET_KEY não foi definida dentro do generateSignature.');
    }

    const message = timestamp + 'GET' + '/api/v2/mix/market/tickers';
    return crypto.createHmac('sha256', BITGET_SECRET_KEY).update(message).digest('base64');
  }

  constructor(
    private readonly prcingHistoryService: PrcingHistoryService, // 🔥 INJETANDO O SERVIÇO DE HISTÓRICO

    @InjectRepository(Ativo)
    private readonly ativosRepository: Repository<Ativo>, // 🔥 Use este nome consistentemente

    @InjectRepository(Exage)
    private readonly exageRepository: Repository<Exage>,

    @InjectRepository(Prcing) // 🔥 Certifique-se de que está injetando a entidade correta
    private readonly prcingRepository: Repository<Prcing>, // 🔥 Nome padronizado

    @InjectRepository(PrcingHistory) // 🔥 Adicionando corretamente a injeção do repositório
    private readonly prcingHistoryRepository: Repository<PrcingHistory>,
  ) {}


    // 🔥 Atualiza preço e salva no histórico
    async atualizarPrecoERegistrarHistorico(ativo: Ativo, exage: Exage, precing: number) {
        // 🔥 Atualiza na tabela `precings`
        let existingPrcing = await this.prcingRepository.findOne({
            where: { ativo: { id: ativo.id }, exage: { id: exage.id } },
        });

        if (existingPrcing) {
            existingPrcing.precing = precing;
            existingPrcing.updated_at = new Date();
            await this.prcingRepository.save(existingPrcing);
        } else {
            const newPrcing = this.prcingRepository.create({
                ativo,
                exage,
                precing,
                type: 1,
                status: 1,
                volum: 0,
                created_at: new Date(),
                updated_at: new Date(),
            });
            await this.prcingRepository.save(newPrcing);
        }

        // 🔥 Salva no histórico `prcing_historico`
        await this.prcingHistoryService.savePriceHistory(ativo, exage, precing);
    }

    async verificarOuAdicionarAtivo(name: string) {
        let ativo = await this.ativosRepository.findOne({ where: { name } });

        if (!ativo) {
        ativo = this.ativosRepository.create({ name, status: 1 });
        await this.ativosRepository.save(ativo);
        console.log(`✅ Ativo ${name} adicionado ao banco de dados.`);
        } else {
        console.log(`🔎 Ativo ${name} já cadastrado.`);
        }
    }

    async getSpotSpotArbitrage(): Promise<any[]> {
    // 🔥 Simulação de dados de arbitragem Spot-Spot
    const opportunities = [
        {
        exchange_buy: "Binance",
        exchange_sell: "Kraken",
        pair: "BTC/USDT",
        buy_price: 50000,
        sell_price: 50500,
        spread: "1.00%",
        },
        {
        exchange_buy: "Coinbase",
        exchange_sell: "KuCoin",
        pair: "ETH/USDT",
        buy_price: 3500,
        sell_price: 3550,
        spread: "1.42%",
        },
    ];

    return opportunities;
    }

    @Cron('*/60 * * * * *')  // 🔥 Executa a cada 30 segundos
    async getGateIoFuturesPrices(): Promise<any[]> {
        try {
            this.logger.log('🔍 Buscando preços futuros da Gate.io...');

            const axiosConfig = {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                timeout: 15000,
            };

            // 🔥 Buscar os ativos cadastrados no banco de dados
            const ativos = await this.ativosRepository.find({ 
                select: ['id', 'name'], 
                where: { status: 1 } 
            });

            if (ativos.length === 0) {
                this.logger.warn('⚠️ Nenhum ativo cadastrado para buscar preços na Gate.io.');
                return [];
            }

            // 🔥 Criar um mapa de ativos para acesso rápido
            const ativosMap = new Map(ativos.map(ativo => [ativo.name.replace(/(\w+)(USDT)/, '$1_USDT'), ativo.id]));

            // 🔥 Buscar as APIs da Gate.io em paralelo
            const [pricesResponse, contractsResponse] = await Promise.all([
                axios.get<{ contract: string; last: string; highest_price_24h: string; lowest_price_24h: string; funding_rate: string; change_percent: string; volume: string; }[]>(this.gateIoAPI, axiosConfig),
                axios.get<{ name: string; order_size_min: string; order_size_max: string; order_value_min: string; order_value_max: string; }[]>(this.gateIoContractsAPI, axiosConfig)
            ]);

            const pricesData = pricesResponse.data || [];
            const contractsData = contractsResponse.data || [];

            // 🔥 Criar um mapa de volumes mínimos e máximos para consulta rápida
            const contractMap = new Map(contractsData.map(contract => [
                contract.name, 
                {
                    min_size: contract.order_size_min || "N/A",  
                    max_size: contract.order_size_max || "N/A",  
                    min_notional: contract.order_value_min || "N/A", 
                    max_notional: contract.order_value_max || "N/A"
                }
            ]));

            // 🔥 Buscar a exchange Gate.io
            const exage = await this.exageRepository.findOne({ where: { id: 2 } });
            if (!exage) {
                this.logger.error('❌ Erro: Exchange Gate.io não encontrada no banco de dados.');
                return [];
            }

            const now = new Date();
            now.setSeconds(0, 0); // Remove segundos e milissegundos para agrupar por minuto

            const batchSize = 10;
            const priceChunks: any[][] = [];

            for (let i = 0; i < pricesData.length; i += batchSize) {
                priceChunks.push(pricesData.slice(i, i + batchSize));
            }

            for (const chunk of priceChunks) {
                const bulkUpdates: Array<{ id: number; precing: number; volum: number; updated_at: Date }> = [];
                const bulkInserts: Array<{ ativo: { id: number }; exage: { id: number }; precing: number; type: number; volum: number; status: number; created_at: Date; updated_at: Date }> = [];
                const bulkHistoryUpdates: Array<{ id: number; precing: number; volum: number; timestamp: Date }> = [];
                const bulkHistoryInserts: Array<{ ativo: { id: number }; exage: { id: number }; precing: number; volum: number; timestamp: Date }> = [];

                await Promise.all(
                    chunk.map(async (item: any) => {
                        const ativoId = ativosMap.get(item.contract);
                        if (!ativoId) {
                            console.log(`⚠️ Ativo ${item.contract} não encontrado no banco.`);
                            return;
                        }

                        console.log(`📌 Processando ${item.contract}`);

                        const lastPrice = parseFloat(item.last) || 0;
                        const volum = parseFloat(item.volume) || 0;

                        const contractInfo = contractMap.get(item.contract) || {
                            min_size: "N/A",
                            max_size: "N/A",
                            min_notional: "N/A",
                            max_notional: "N/A"
                        };

                        const existingPrcing = await this.prcingRepository.findOne({
                            select: ['id', 'precing'],
                            where: { ativo: { id: ativoId }, exage: { id: exage.id } },
                        });

                        if (existingPrcing) {
                            bulkUpdates.push({
                                id: existingPrcing.id,
                                precing: lastPrice,
                                volum,
                                updated_at: now,
                            });
                        } else {
                            bulkInserts.push({
                                ativo: { id: ativoId },
                                exage: { id: exage.id },
                                precing: lastPrice,
                                type: 1,
                                volum,
                                status: 1,
                                created_at: now,
                                updated_at: now,
                            });
                        }

                        const existingHistory = await this.prcingHistoryRepository.findOne({
                            where: { ativo: { id: ativoId }, exage: { id: exage.id }, timestamp: now },
                        });

                        if (existingHistory) {
                            bulkHistoryUpdates.push({
                                id: existingHistory.id,
                                precing: lastPrice,
                                volum,
                                timestamp: now,
                            });
                        } else {
                            bulkHistoryInserts.push({
                                ativo: { id: ativoId },
                                exage: { id: exage.id },
                                precing: lastPrice,
                                volum,
                                timestamp: now,
                            });
                        }
                    })
                );

                if (bulkUpdates.length > 0) {
                    await this.prcingRepository.save(bulkUpdates);
                }
                if (bulkInserts.length > 0) {
                    await this.prcingRepository.save(bulkInserts);
                }
                if (bulkHistoryUpdates.length > 0) {
                    await this.prcingHistoryRepository.save(bulkHistoryUpdates);
                }
                if (bulkHistoryInserts.length > 0) {
                    await this.prcingHistoryRepository.save(bulkHistoryInserts);
                }

                this.logger.log(`✅ Gate.io: Atualizados ${bulkUpdates.length}, Inseridos ${bulkInserts.length}, Histórico Atualizados ${bulkHistoryUpdates.length}, Histórico Inseridos ${bulkHistoryInserts.length}`);
            }

            return pricesData.map(item => ({
                pair: item.contract.replace('_', '/'),
                last_price: item.last,
                highest_price_24h: item.highest_price_24h,
                lowest_price_24h: item.lowest_price_24h,
                funding_rate: item.funding_rate,
                change_24h: item.change_percent,
                min_size: contractMap.get(item.contract)?.min_size || "N/A",
                max_size: contractMap.get(item.contract)?.max_size || "N/A",
                min_notional: contractMap.get(item.contract)?.min_notional || "N/A",
                max_notional: contractMap.get(item.contract)?.max_notional || "N/A"
            }));
        } catch (error) {
            this.logger.error(`❌ Erro ao buscar preços futuros da Gate.io: ${error.message}`);
            return [];
        }
    }
      

    @Cron('*/60 * * * * *')  // 🔥 Executa a cada 30 segundos
    async getMexcFuturesPrices(): Promise<any[]> {
        try {
            this.logger.log('🔍 Buscando preços futuros da MEXC...');

            const axiosConfig = {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                timeout: 15000,
            };

            // 🔥 Buscar os ativos cadastrados no banco de dados
            const ativos = await this.ativosRepository.find({ 
                select: ['id', 'name'], 
                where: { status: 1 } 
            });

            if (ativos.length === 0) {
                this.logger.warn('⚠️ Nenhum ativo cadastrado para buscar preços na MEXC.');
                return [];
            }

            // 🔥 Criar um mapa de ativos para acesso rápido
            const ativosMap = new Map(ativos.map(ativo => [ativo.name.replace(/(\w+)(USDT)/, '$1_USDT'), ativo.id]));

            // 🔥 Buscar as APIs da MEXC em paralelo
            const [pricesResponse, contractsResponse] = await Promise.all([
                axios.get<{ data: { symbol: string; lastPrice: string; highPrice24h: string; lowPrice24h: string; fundingRate: string; priceChangePercent: string; volume: string; }[] }>(this.mexcAPI, axiosConfig),
                axios.get<{ data: { symbol: string; minVol: string; maxVol: string; minAmount: string; maxAmount: string; }[] }>(this.mexcContractsAPI, axiosConfig)
            ]);

            const pricesData = pricesResponse.data.data || [];
            const contractsData = contractsResponse.data.data || [];

            // 🔥 Criar um mapa de volumes mínimos e máximos para consulta rápida
            const contractMap = new Map(contractsData.map(contract => [
                contract.symbol, 
                {
                    min_size: contract.minVol || "N/A",  
                    max_size: contract.maxVol || "N/A",  
                    min_notional: contract.minAmount || "N/A", 
                    max_notional: contract.maxAmount || "N/A"
                }
            ]));

            // 🔥 Buscar a exchange MEXC
            const exage = await this.exageRepository.findOne({ where: { id: 3 } });
            if (!exage) {
                this.logger.error('❌ Erro: Exchange MEXC não encontrada no banco de dados.');
                return [];
            }

            const now = new Date();
            now.setSeconds(0, 0); // Remove segundos e milissegundos para agrupar por minuto

            const batchSize = 10;
            const priceChunks: any[][] = [];

            for (let i = 0; i < pricesData.length; i += batchSize) {
                priceChunks.push(pricesData.slice(i, i + batchSize));
            }

            for (const chunk of priceChunks) {
                const bulkUpdates: Array<{ id: number; precing: number; volum: number; updated_at: Date }> = [];
                const bulkInserts: Array<{ ativo: { id: number }; exage: { id: number }; precing: number; type: number; volum: number; status: number; created_at: Date; updated_at: Date }> = [];
                const bulkHistoryUpdates: Array<{ id: number; precing: number; volum: number; timestamp: Date }> = [];
                const bulkHistoryInserts: Array<{ ativo: { id: number }; exage: { id: number }; precing: number; volum: number; timestamp: Date }> = [];

                await Promise.all(
                    chunk.map(async (item: any) => {
                        const ativoId = ativosMap.get(item.symbol);
                        if (!ativoId) {
                            console.log(`⚠️ Ativo ${item.symbol} não encontrado no banco.`);
                            return;
                        }

                        console.log(`📌 Processando ${item.symbol}`);

                        const lastPrice = parseFloat(item.lastPrice) || 0;
                        const volum = parseFloat(item.volume) || 0;

                        const contractInfo = contractMap.get(item.symbol) || {
                            min_size: "N/A",
                            max_size: "N/A",
                            min_notional: "N/A",
                            max_notional: "N/A"
                        };

                        const existingPrcing = await this.prcingRepository.findOne({
                            select: ['id', 'precing'],
                            where: { ativo: { id: ativoId }, exage: { id: exage.id } },
                        });

                        if (existingPrcing) {
                            bulkUpdates.push({
                                id: existingPrcing.id,
                                precing: lastPrice,
                                volum,
                                updated_at: now,
                            });
                        } else {
                            bulkInserts.push({
                                ativo: { id: ativoId },
                                exage: { id: exage.id },
                                precing: lastPrice,
                                type: 1,
                                volum,
                                status: 1,
                                created_at: now,
                                updated_at: now,
                            });
                        }

                        const existingHistory = await this.prcingHistoryRepository.findOne({
                            where: { ativo: { id: ativoId }, exage: { id: exage.id }, timestamp: now },
                        });

                        if (existingHistory) {
                            bulkHistoryUpdates.push({
                                id: existingHistory.id,
                                precing: lastPrice,
                                volum,
                                timestamp: now,
                            });
                        } else {
                            bulkHistoryInserts.push({
                                ativo: { id: ativoId },
                                exage: { id: exage.id },
                                precing: lastPrice,
                                volum,
                                timestamp: now,
                            });
                        }
                    })
                );

                if (bulkUpdates.length > 0) {
                    await this.prcingRepository.save(bulkUpdates);
                }
                if (bulkInserts.length > 0) {
                    await this.prcingRepository.save(bulkInserts);
                }
                if (bulkHistoryUpdates.length > 0) {
                    await this.prcingHistoryRepository.save(bulkHistoryUpdates);
                }
                if (bulkHistoryInserts.length > 0) {
                    await this.prcingHistoryRepository.save(bulkHistoryInserts);
                }

                this.logger.log(`✅ MEXC: Atualizados ${bulkUpdates.length}, Inseridos ${bulkInserts.length}, Histórico Atualizados ${bulkHistoryUpdates.length}, Histórico Inseridos ${bulkHistoryInserts.length}`);
            }

            return pricesData.map(item => ({
                pair: item.symbol.replace('_', '/'),
                last_price: item.lastPrice,
                highest_price_24h: item.highPrice24h,
                lowest_price_24h: item.lowPrice24h,
                funding_rate: item.fundingRate,
                change_24h: item.priceChangePercent,
                min_size: contractMap.get(item.symbol)?.min_size || "N/A",
                max_size: contractMap.get(item.symbol)?.max_size || "N/A",
                min_notional: contractMap.get(item.symbol)?.min_notional || "N/A",
                max_notional: contractMap.get(item.symbol)?.max_notional || "N/A"
            }));
        } catch (error) {
            this.logger.error(`❌ Erro ao buscar preços futuros da MEXC: ${error.message}`);
            return [];
        }
    }
      

    @Cron('*/60 * * * * *')  // 🔥 Executa a cada 30 segundos
    async getBitgetFuturesPrices(): Promise<any> {
        try {
            this.logger.log('🔍 Buscando preços futuros da Bitget...');
    
            const axiosConfig = {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                timeout: 15000,
            };
    
            // 🔥 Buscar os ativos cadastrados no banco de dados
            const ativos = await this.ativosRepository.find({ 
                select: ['id', 'name'], 
                where: { status: 1 } 
            });
    
            if (ativos.length === 0) {
                this.logger.warn('⚠️ Nenhum ativo cadastrado para buscar preços na Bitget.');
                return { success: false, message: 'Nenhum ativo encontrado' };
            }
    
            // 🔥 Buscar a exchange Bitget
            const exage = await this.exageRepository.findOne({ where: { id: 5 } });
            if (!exage) {
                this.logger.error('❌ Erro: Exchange Bitget não encontrada no banco de dados.');
                return { success: false, message: 'Exchange não encontrada' };
            }
    
            const now = new Date();
            now.setSeconds(0, 0);
    
            for (const ativo of ativos) {
                const symbol = `${ativo.name}_UMCBL`;
                const url = `https://api.bitget.com/api/mix/v1/market/ticker?symbol=${symbol}`;
    
                try {
                    const response = await axios.get<{ data: { last: string; quoteVolume: string } }>(
                        url, axiosConfig
                    );
    
                    const priceData = response.data.data;
                    if (!priceData?.last || !priceData?.quoteVolume) {
                        this.logger.warn(`⚠️ Dados ausentes para ${symbol}: ${JSON.stringify(priceData)}`);
                        continue;
                    }
    
                    const lastPrice = parseFloat(priceData.last) || 0;
                    const volume = parseFloat(priceData.quoteVolume) || 0;
    
                    const existingPrcing = await this.prcingRepository.findOne({
                        select: ['id', 'precing'],
                        where: { ativo: { id: ativo.id }, exage: { id: exage.id } },
                    });
    
                    if (existingPrcing) {
                        await this.prcingRepository.update(existingPrcing.id, {
                            precing: lastPrice,
                            volum: volume, // Correção aqui
                            updated_at: now,
                        });
                    } else {
                        await this.prcingRepository.insert({
                            ativo: { id: ativo.id },
                            exage: { id: exage.id },
                            precing: lastPrice,
                            type: 1,
                            volum: volume, // Correção aqui
                            status: 1,
                            created_at: now,
                            updated_at: now,
                        });
                    }
    
                    const existingHistory = await this.prcingHistoryRepository.findOne({
                        where: { ativo: { id: ativo.id }, exage: { id: exage.id }, timestamp: now },
                    });
    
                    if (existingHistory) {
                        await this.prcingHistoryRepository.update(existingHistory.id, {
                            precing: lastPrice,
                            timestamp: now,
                        });
                    } else {
                        await this.prcingHistoryRepository.insert({
                            ativo: { id: ativo.id },
                            exage: { id: exage.id },
                            precing: lastPrice,
                            timestamp: now,
                        });
                    }
                } catch (error) {
                    this.logger.error(`❌ Erro ao buscar preço para ${symbol}: ${error.message}`);
                }
            }
    
            this.logger.log(`✅ Bitget: Preços atualizados para ${ativos.length} ativos.`);
            return { success: true, updated: ativos.length };
    
        } catch (error) {
            this.logger.error(`❌ Erro ao buscar preços futuros da Bitget: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    

    @Cron('*/60 * * * * *')  // 🔥 Executa a cada 30 segundos
    async getBinanceFuturesPrices(): Promise<BinancePrice[]> {
        try {
            this.logger.log('🔍 Buscando preços da Binance...');

            const axiosConfig = {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                timeout: 15000,
            };

            const [ativos, exages, response, contractsResponse] = await Promise.all([
                this.ativosRepository.find({ where: { status: 1 } }),
                this.exageRepository.find(),
                axios.get(this.binanceFuturesAPI, axiosConfig),
                axios.get(this.binanceContractsAPI, axiosConfig),
            ]);

            console.log(`🔍 Ativos encontrados no banco: ${ativos.length}`);
            console.log(`🔍 Resposta da API Binance:`, response.data);

            if (!Array.isArray(response.data)) {
                throw new Error('Dados da Binance não estão no formato esperado.');
            }

            const ativosMap = new Map(ativos.map(a => [a.name.toUpperCase(), a]));
            const exage = exages.find(e => e.id === 1);

            if (!exage) {
                this.logger.error('❌ Corretora Binance não encontrada!');
                return [];
            }

            const contractsData = contractsResponse.data as { symbols: BinanceContract[] };
            const contractMap = new Map(
                contractsData.symbols.map(contract => [
                    contract.symbol,
                    {
                        min_size: contract.filters.find(f => f.filterType === "LOT_SIZE")?.minQty || "N/A",
                        max_size: contract.filters.find(f => f.filterType === "LOT_SIZE")?.maxQty || "N/A",
                        min_notional: contract.filters.find(f => f.filterType === "MIN_NOTIONAL")?.notional || "N/A",
                    } as BinanceContractInfo,
                ])
            );

            const pricesData: BinancePrice[] = response.data;
            const processedData: BinancePrice[] = [];
            const now = new Date();
            now.setSeconds(0, 0);

            const batchSize = 10;
            const priceChunks: BinancePrice[][] = [];

            for (let i = 0; i < pricesData.length; i += batchSize) {
                priceChunks.push(pricesData.slice(i, i + batchSize));
            }

            for (const chunk of priceChunks) {
                const bulkUpdates: Array<{ id: number; precing: number; volum: number; updated_at: Date }> = [];
                const bulkInserts: Array<{ ativo: { id: number }; exage: { id: number }; precing: number; volum: number; type: number; status: number; created_at: Date; updated_at: Date }> = [];
                const bulkHistoryUpdates: Array<{ id: number; precing: number; volum: number; timestamp: Date }> = [];
                const bulkHistoryInserts: Array<{ ativo: { id: number }; exage: { id: number }; precing: number; volum: number; timestamp: Date }> = [];

                await Promise.all(
                    chunk.map(async (item: any) => {
                        const ativo = ativosMap.get(item.symbol.toUpperCase());
                        if (!ativo) {
                            console.log(`⚠️ Ativo ${item.symbol} não encontrado no banco.`);
                            return;
                        }

                        console.log(`📌 Processando ${item.symbol}`);

                        const lastPrice = parseFloat(item.lastPrice) || 0;
                        const volum = parseFloat(item.volume) || 0; // Adicionando volume corretamente

                        const existingPrcing = await this.prcingRepository.findOne({
                            select: ['id', 'precing'],
                            where: { ativo: { id: ativo.id }, exage: { id: exage.id } },
                        });

                        if (existingPrcing) {
                            bulkUpdates.push({
                                id: existingPrcing.id,
                                precing: lastPrice,
                                volum,
                                updated_at: now,
                            });
                        } else {
                            bulkInserts.push({
                                ativo: { id: ativo.id },
                                exage: { id: exage.id },
                                precing: lastPrice,
                                volum,
                                type: 1,
                                status: 1,
                                created_at: now,
                                updated_at: now,
                            });
                        }

                        const existingHistory = await this.prcingHistoryRepository.findOne({
                            where: { ativo: { id: ativo.id }, exage: { id: exage.id }, timestamp: now },
                        });

                        if (existingHistory) {
                            bulkHistoryUpdates.push({
                                id: existingHistory.id,
                                precing: lastPrice,
                                volum,
                                timestamp: now,
                            });
                        } else {
                            bulkHistoryInserts.push({
                                ativo: { id: ativo.id },
                                exage: { id: exage.id },
                                precing: lastPrice,
                                volum,
                                timestamp: now,
                            });
                        }

                        processedData.push({
                            pair: item.symbol,
                            last_price: lastPrice.toFixed(4),
                            highest_price_24h: item.highPrice,
                            lowest_price_24h: item.lowPrice,
                            funding_rate: item.fundingRate || "N/A",
                            change_24h: item.priceChangePercent,
                            min_size: contractMap.get(item.symbol)?.min_size || "N/A",
                            max_size: contractMap.get(item.symbol)?.max_size || "N/A",
                            min_notional: contractMap.get(item.symbol)?.min_notional || "N/A",
                        });
                    })
                );

                if (bulkUpdates.length > 0) {
                    await this.prcingRepository.save(bulkUpdates);
                }
                if (bulkInserts.length > 0) {
                    await this.prcingRepository.save(bulkInserts);
                }
                if (bulkHistoryUpdates.length > 0) {
                    await this.prcingHistoryRepository.save(bulkHistoryUpdates);
                }
                if (bulkHistoryInserts.length > 0) {
                    await this.prcingHistoryRepository.save(bulkHistoryInserts);
                }

                this.logger.log(`✅ Binance: Atualizados ${bulkUpdates.length}, Inseridos ${bulkInserts.length}, Histórico Atualizados ${bulkHistoryUpdates.length}, Histórico Inseridos ${bulkHistoryInserts.length}`);
            }

            return processedData;
        } catch (error) {
            this.logger.error(`❌ Erro ao buscar preços da Binance: ${error.message}`);
            return [];
        }
    }
    

    @Cron('*/60 * * * * *')  // 🔥 Executa a cada 30 segundos
    async getHtxFuturesPrices(): Promise<any> {
        try {
            this.logger.log('🔍 Buscando preços futuros da HTX...');

            const axiosConfig = {
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                timeout: 15000,
            };

            // 🔥 Buscar os ativos cadastrados no banco de dados
            const ativos = await this.ativosRepository.find({
                select: ['id', 'name'],
                where: { status: 1 }
            });

            if (ativos.length === 0) {
                this.logger.warn('⚠️ Nenhum ativo cadastrado para buscar preços na HTX.');
                return { success: false, message: 'Nenhum ativo encontrado' };
            }

            // 🔥 Buscar a exchange HTX
            const exage = await this.exageRepository.findOne({ where: { id: 4 } }); // ID da HTX
            if (!exage) {
                this.logger.error('❌ Erro: Exchange HTX não encontrada no banco de dados.');
                return { success: false, message: 'Exchange não encontrada' };
            }

            const now = new Date();
            now.setSeconds(0, 0);

            for (const ativo of ativos) {
                const symbol = ativo.name.replace(/(USDT|USDC|BUSD)$/, '-$1'); // Converte "BTCUSDT" para "BTC-USDT"
                const url = `https://api.hbdm.com/linear-swap-ex/market/detail/merged?contract_code=${symbol}`;

                try {
                    const response = await axios.get<{ tick: { close: number; vol: number } }>(
                        url, axiosConfig
                    );

                    const priceData = response.data.tick;
                    if (!priceData?.close || !priceData?.vol) {
                        this.logger.warn(`⚠️ Dados ausentes para ${symbol}: ${JSON.stringify(priceData)}`);
                        continue;
                    }

                    const lastPrice = priceData.close || 0;
                    const volume = priceData.vol || 0;

                    const existingPrcing = await this.prcingRepository.findOne({
                        select: ['id', 'precing'],
                        where: { ativo: { id: ativo.id }, exage: { id: exage.id } },
                    });

                    if (existingPrcing) {
                        await this.prcingRepository.update(existingPrcing.id, {
                            precing: lastPrice,
                            volum: volume,
                            updated_at: now,
                        });
                    } else {
                        await this.prcingRepository.insert({
                            ativo: { id: ativo.id },
                            exage: { id: exage.id },
                            precing: lastPrice,
                            type: 1,
                            volum: volume,
                            status: 1,
                            created_at: now,
                            updated_at: now,
                        });
                    }

                    const existingHistory = await this.prcingHistoryRepository.findOne({
                        where: { ativo: { id: ativo.id }, exage: { id: exage.id }, timestamp: now },
                    });

                    if (existingHistory) {
                        await this.prcingHistoryRepository.update(existingHistory.id, {
                            precing: lastPrice,
                            timestamp: now,
                        });
                    } else {
                        await this.prcingHistoryRepository.insert({
                            ativo: { id: ativo.id },
                            exage: { id: exage.id },
                            precing: lastPrice,
                            timestamp: now,
                        });
                    }
                } catch (error) {
                    this.logger.error(`❌ Erro ao buscar preço para ${symbol}: ${error.message}`);
                }
            }

            this.logger.log(`✅ HTX: Preços atualizados para ${ativos.length} ativos.`);
            return { success: true, updated: ativos.length };

        } catch (error) {
            this.logger.error(`❌ Erro ao buscar preços futuros da HTX: ${error.message}`);
            return { success: false, error: error.message };
        }
    }


    async getArbitrageOpportunities(): Promise<any[]> {
        try {
            this.logger.log('🔍 Analisando oportunidades de arbitragem...');

            // 🔥 Buscar apenas os preços recentes do banco de dados (últimos 60 segundos)
            const precings = await this.prcingRepository.find({
                select: ['precing', 'updated_at'],
                where: { updated_at: MoreThan(new Date(Date.now() - 60 * 1000)) }, // Apenas preços recentes
                relations: ['ativo', 'exage'],
            });

            if (precings.length === 0) {
                this.logger.warn('⚠️ Nenhum dado de preço recente disponível para análise.');
                return [];
            }

            // 🔥 Organizar os preços por ativo
            const precingsByAtivo = new Map<string, any[]>();

            for (const p of precings) {
                const ativoName = p.ativo.name;
                if (!precingsByAtivo.has(ativoName)) {
                    precingsByAtivo.set(ativoName, []);
                }
                precingsByAtivo.get(ativoName)!.push(p);
            }

            const oportunidades: any[] = [];
            const agora = Date.now(); // Timestamp atual

            for (const [ativo, precings] of precingsByAtivo.entries()) {
                if (precings.length < 2) continue; // Ignora ativos sem ao menos 2 preços

                // 🔥 Buscar preços atualizados nas corretoras para esse ativo
                const pricesPromises = precings.map(async (p) => {
                    const updatedPrice = await this.getPriceFromExchange(ativo, p.exage.name);
                    return {
                        ...p,
                        precing: updatedPrice.price && updatedPrice.price > 0 ? updatedPrice.price : p.precing, // Se não obtiver preço atualizado, usa o do banco
                    };
                });

                const precingsAtualizados = await Promise.all(pricesPromises);

                // 🔥 Encontrar menor (compra) e maior (venda) preço
                let compra = precingsAtualizados[0];
                let venda = precingsAtualizados[0];

                for (const p of precingsAtualizados) {
                    if (Number(p.precing) < Number(compra.precing)) compra = p;
                    if (Number(p.precing) > Number(venda.precing)) venda = p;
                }

                // 🔥 Se não há spread positivo, ignora a oportunidade
                if (Number(compra.precing) >= Number(venda.precing)) continue;

                const precoCompra = Number(compra.precing);
                const precoVenda = Number(venda.precing);
                const spread = ((precoVenda - precoCompra) / precoCompra) * 100;

                // 🔥 Tempo desde a última atualização
                const atualizadoSegundos = Math.floor((agora - new Date(compra.updated_at).getTime()) / 1000);

                let atualizadoFormatado: string;
                if (atualizadoSegundos < 60) {
                    atualizadoFormatado = `${atualizadoSegundos} segundos atrás`;
                } else if (atualizadoSegundos < 3600) {
                    const minutos = Math.floor(atualizadoSegundos / 60);
                    atualizadoFormatado = `${minutos} minutos atrás`;
                } else {
                    const horas = Math.floor(atualizadoSegundos / 3600);
                    atualizadoFormatado = `${horas} horas atrás`;
                }

                // 🔥 Gerar os links para as exchanges envolvidas
                const link_01 = this.generateExchangeLink(compra.exage.name, ativo);
                const link_02 = this.generateExchangeLink(venda.exage.name, ativo);

                // 🔥 Adiciona à lista de oportunidades
                oportunidades.push({
                    Moeda: ativo,
                    Compra: compra.exage.name,
                    Venda: venda.exage.name,
                    Precing_Compra: precoCompra.toFixed(4),
                    Precing_Venda: precoVenda.toFixed(4),
                    Spread: spread.toFixed(2) + '%',
                    Atualizado: atualizadoFormatado,
                    link_01,
                    link_02,
                });
            }

            this.logger.log(`✅ Oportunidades encontradas: ${oportunidades.length}`);
            return oportunidades;
        } catch (error) {
            this.logger.error(`❌ Erro ao calcular oportunidades de arbitragem: ${error.message}`);
            return [];
        }
    }

    async getPriceFromExchange(ativo: string, exchange: string): Promise<{ price: number; fundingRate: number; volume: number }> {
    try {
        let url = '';
        let priceKey = '';
        let fundingRateKey = '';
        let volumeKey = '';

        // 🔥 Ajustar formato do ativo para corretoras específicas
        const formattedAtivo =
            exchange.toLowerCase() === 'Gate.io' || exchange.toLowerCase() === 'MEXC'
                ? ativo.replace(/(\w+)(USDT)$/, '$1_USDT')
                : ativo;

        switch (exchange.toLowerCase()) {
            case 'Binance':
                url = `https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${formattedAtivo}`;
                priceKey = 'lastPrice';
                fundingRateKey = 'fundingRate';
                volumeKey = 'volume';
                break;
            case 'Gate.io':
                url = `https://api.gateio.ws/api/v4/futures/usdt/tickers?contract=${formattedAtivo}`;
                priceKey = 'last';
                fundingRateKey = 'funding_rate';
                volumeKey = 'volume';
                break;
            case 'MEXC':
                url = `https://contract.mexc.com/api/v1/contract/ticker?symbol=${formattedAtivo}`;
                priceKey = 'data.lastPrice';
                fundingRateKey = 'data.fundingRate';
                volumeKey = 'data.volume';
                break;
            case 'bitget':
                url = `https://api.bitget.com/api/v2/mix/market/ticker?symbol=${formattedAtivo}`;
                priceKey = 'last';
                fundingRateKey = 'fundingRate';
                volumeKey = 'volume';
                break;
            case 'htx':
                url = `https://api.huobi.pro/market/detail/merged?symbol=${formattedAtivo.toLowerCase()}`;
                priceKey = 'close';
                fundingRateKey = 'fundingRate';
                volumeKey = 'vol';
                break;
            default:
                this.logger.error(`❌ Exchange ${exchange} não reconhecida.`);
                return { price: 0, fundingRate: 0, volume: 0 };
        }

        let attempts = 3; // 🔥 Tentativas de reexecução
        while (attempts > 0) {
            try {
                const response = await axios.get(url, { timeout: 15000 }); // 🔥 Timeout de 15s
                const data = response.data as any;

                if (exchange.toLowerCase() === 'gate.io') {
                    const filteredData = data.find((item: any) => item.contract === formattedAtivo);
                    if (!filteredData) {
                        throw new Error(`❌ Ativo ${formattedAtivo} não encontrado na Gate.io`);
                    }
                    return {
                        price: parseFloat(filteredData[priceKey] || '0'),
                        fundingRate: parseFloat(filteredData[fundingRateKey] || '0'),
                        volume: parseFloat(filteredData[volumeKey] || '0'),
                    };
                }

                // 🔥 A MEXC coloca os dados dentro de um objeto `data`
                return {
                    price: parseFloat(priceKey.split('.').reduce((o, k) => (o || {})[k], data) || '0'),
                    fundingRate: parseFloat(fundingRateKey.split('.').reduce((o, k) => (o || {})[k], data) || '0'),
                    volume: parseFloat(volumeKey.split('.').reduce((o, k) => (o || {})[k], data) || '0'),
                };
            } catch (error) {
                if (error.code === 'ECONNRESET' || error.message.includes('socket hang up')) {
                    this.logger.warn(`⚠️ Timeout na ${exchange}. Tentando novamente... (${3 - attempts + 1}/3)`);
                    attempts--;
                    await new Promise((res) => setTimeout(res, 2000)); // 🔥 Espera antes de tentar de novo
                    continue;
                }
                this.logger.error(`❌ Erro ao buscar preço para ${ativo} na ${exchange}:`, error.message);
                return { price: 0, fundingRate: 0, volume: 0 };
            }
        }

        this.logger.error(`❌ Falha ao buscar preço na ${exchange} após múltiplas tentativas.`);
        return { price: 0, fundingRate: 0, volume: 0 };
    } catch (error) {
        this.logger.error(`❌ Erro inesperado ao buscar preço para ${ativo} na ${exchange}:`, error.message);
        return { price: 0, fundingRate: 0, volume: 0 };
    }
    }


    // 🔥 Função auxiliar para gerar os links dinâmicos das corretoras
    private generateExchangeLink(exchange: string, ativo: string): string {
      const formattedAtivo = ativo.replace('/', '').toUpperCase(); // 🔄 Formatação do ativo (ex: BTC/USDT → BTCUSDT)
      
      // 🔄 Formatação específica para cada corretora
      const formattedGateAtivo = formattedAtivo.replace('USDT', '_USDT'); // Gate.io usa "SWGT_USDT"
      const formattedBitgetAtivo = formattedAtivo.replace('USDT', 'USDT_UMCBL'); // Bitget usa "BTCUSDT_UMCBL"
  
      const exchangeLinks: { [key: string]: string } = {
          'Binance': `https://www.binance.com/en/futures/${formattedAtivo}`,
          'Kraken': `https://futures.kraken.com/trade/${formattedAtivo}`,
          'Coinbase': `https://pro.coinbase.com/trade/${formattedAtivo}`,
          'KuCoin': `https://www.kucoin.com/futures/${formattedAtivo}`,
          'Bybit': `https://www.bybit.com/en-US/trade/${formattedAtivo}`,
          'Bitget': `https://www.bitget.com/en/contract/${formattedBitgetAtivo}`,
          'Gate.io': `https://www.gate.io/pt/trade/${formattedGateAtivo}`, // ✅ Agora no formato correto
          'MEXC': `https://futures.mexc.com/exchange/${formattedGateAtivo}`,
          'HTX': `https://www.huobi.com/en-us/futures/${formattedAtivo}`,
      };
  
      return exchangeLinks[exchange] || `https://www.google.com/search?q=${formattedAtivo}`; // 🔍 Link de fallback
    }
  

    async analisarArbitragemEntreCorretorasRealtime(ativo: string, longExage: string, shortExage: string): Promise<any> {
    try {
        this.logger.log(`🔍 Buscando arbitragem em tempo real entre ${longExage} (Long) e ${shortExage} (Short) para ${ativo}...`);

        // 🔥 Buscar preço e funding rate diretamente nas APIs das corretoras
        const longData = await this.getPriceFromExchange(ativo, longExage);
        const shortData = await this.getPriceFromExchange(ativo, shortExage);

        if (!longData || !shortData) {
            return { error: `❌ Dados não disponíveis para uma das corretoras.` };
        }

        // 🔥 Cálculo do spread (%)
        const spread = ((shortData.price - longData.price) / longData.price) * 100;

        // 🔥 Buscar histórico de preços dos últimos 7 dias diretamente das APIs
        const histLong = await this.getHistoricalPrices(ativo, longExage);
        const histShort = await this.getHistoricalPrices(ativo, shortExage);

        // 🔥 Retorno dos dados formatados
        return {
            Moeda: ativo,
            hist_01: histLong,
            hist_02: histShort,
            precing_01: longData.price.toFixed(4),
            precing_02: shortData.price.toFixed(4),
            spreed: spread.toFixed(2) + '%',
            fundingRate_01: longData.fundingRate ? longData.fundingRate.toFixed(4) : 'N/A',
            fundingRate_02: shortData.fundingRate ? shortData.fundingRate.toFixed(4) : 'N/A',
            Vol_01: longData.volume ? longData.volume.toFixed(4) : 'N/A',
            Vol_02: shortData.volume ? shortData.volume.toFixed(4) : 'N/A',
        };
    } catch (error) {
        this.logger.error('❌ Erro ao buscar análise de arbitragem em tempo real:', error.message);
        return { error: 'Erro ao processar a solicitação' };
    }
    }


    async getHistoricalPrices(ativo: string, exchange: string): Promise<any[]> {
    try {
        this.logger.log(`🔍 Buscando os últimos preços disponíveis para ${ativo} na ${exchange}...`);

        let url = '';

        // 🔥 Ajustar formato do ativo para corretoras específicas (Gate.io e MEXC exigem BTC_USDT)
        const formattedAtivo = exchange.toLowerCase() === 'Gate.io' || exchange.toLowerCase() === 'MEXC'
            ? ativo.replace(/(\w+)(USDT)$/, '$1_USDT') 
            : ativo;

        switch (exchange.toLowerCase()) {
            case 'Binance':
                url = `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${formattedAtivo}`;
                break;
            case 'Gate.io':
                url = `https://api.gateio.ws/api/v4/futures/usdt/tickers`;
                break;
            case 'MEXC':
                url = `https://contract.mexc.com/api/v1/contract/ticker?symbol=${formattedAtivo}`;
                break;
            case 'bitget':
                url = `https://api.bitget.com/api/v2/mix/market/ticker?symbol=${formattedAtivo}`;
                break;
            case 'htx':
                url = `https://api.huobi.pro/market/detail/merged?symbol=${formattedAtivo.toLowerCase()}`;
                break;
            default:
                this.logger.error(`❌ Exchange ${exchange} não reconhecida.`);
                return [];
        }

        const response = await axios.get(url, { timeout: 10000 });

        // 🔥 Verificação de resposta válida
        if (response.status !== 200 || !response.data) {
            throw new Error(`Resposta inválida da API (${exchange})`);
        }

        let priceData: { price: string; timestamp: number } | null = null;

        // 🔥 **Corrigindo a validação usando `typeof` e `Array.isArray()`**
        if (exchange.toLowerCase() === 'Binance' && typeof response.data === 'object' && 'price' in response.data) {
            priceData = {
                price: parseFloat((response.data as { price: string }).price).toString(),
                timestamp: Date.now()
            };
        }

        if (exchange.toLowerCase() === 'Gate.io' && Array.isArray(response.data)) {
            const gateData = response.data.find((item: any) => item.contract === formattedAtivo);
            if (gateData && typeof gateData === 'object' && 'last' in gateData) {
                priceData = {
                    price: parseFloat(gateData.last).toString(),
                    timestamp: Date.now()
                };
            }
        }

        if (exchange.toLowerCase() === 'MEXC' && typeof response.data === 'object' && response.data.hasOwnProperty('data')) {
            const mexcData = response.data as { data: { lastPrice: string } };
            if ('lastPrice' in mexcData.data) {
                priceData = {
                    price: parseFloat(mexcData.data.lastPrice).toString(),
                    timestamp: Date.now()
                };
            }
        }

        if (exchange.toLowerCase() === 'bitget' && typeof response.data === 'object' && response.data.hasOwnProperty('data')) {
            const bitgetData = response.data as { data: { last: string } };
            if ('last' in bitgetData.data) {
                priceData = {
                    price: parseFloat(bitgetData.data.last).toString(),
                    timestamp: Date.now()
                };
            }
        }

        if (exchange.toLowerCase() === 'htx' && typeof response.data === 'object' && response.data.hasOwnProperty('tick')) {
            const htxData = response.data as { tick: { close: string } };
            if ('close' in htxData.tick) {
                priceData = {
                    price: parseFloat(htxData.tick.close).toString(),
                    timestamp: Date.now()
                };
            }
        }

        if (!priceData || parseFloat(priceData.price) === 0) {
            throw new Error(`Preço inválido retornado da ${exchange}`);
        }

        return [priceData];
    } catch (error) {
        this.logger.error(`❌ Erro ao buscar os últimos preços para ${ativo} na ${exchange}:`, error.message);
        return [];
    }
    }


    async getLiveArbitrage(ativo: string, exchange1: string, exchange2: string): Promise<any> {
      try {
          this.logger.log(`🔍 Comparando ${ativo} entre ${exchange1} e ${exchange2}...`);

          // 🔥 Buscar preços em tempo real nas duas corretoras
          const [price1, price2] = await Promise.all([
              this.getPriceFromExchange(ativo, exchange1),
              this.getPriceFromExchange(ativo, exchange2),
          ]);

          // 🔥 Verificar se os dados foram retornados corretamente
          if (!price1.price || !price2.price) {
              return { error: `❌ Dados não disponíveis para uma das corretoras.` };
          }

          // 🔥 Identificar melhor compra e venda
          const comprarEm = price1.price < price2.price ? exchange1 : exchange2;
          const venderEm = price1.price > price2.price ? exchange1 : exchange2;
          const precoCompra = Math.min(price1.price, price2.price);
          const precoVenda = Math.max(price1.price, price2.price);
          const spread = ((precoVenda - precoCompra) / precoCompra) * 100;

          return {
              ativo,
              preços: {
                  [exchange1]: price1.price.toFixed(4),
                  [exchange2]: price2.price.toFixed(4),
              },
              comprar_em: comprarEm,
              vender_em: venderEm,
              spread: `${spread.toFixed(2)}%`,
              funding_rates: {
                  [exchange1]: price1.fundingRate ? price1.fundingRate.toFixed(4) : 'N/A',
                  [exchange2]: price2.fundingRate ? price2.fundingRate.toFixed(4) : 'N/A',
              },
              volume: {
                  [exchange1]: price1.volume ? price1.volume.toFixed(4) : 'N/A',
                  [exchange2]: price2.volume ? price2.volume.toFixed(4) : 'N/A',
              }
          };
      } catch (error) {
          this.logger.error('❌ Erro ao buscar arbitragem em tempo real:', error.message);
          return { error: 'Erro ao processar a solicitação' };
      }
    }



  async getPriceFromExchange2(ativo: string, exchange: string): Promise<{ price: number; fundingRate: number; volume: number }> {
    try {
        // ✅ Formatar o ativo corretamente para cada exchange
        const formattedAtivo = this.formatAtivoForExchange(ativo, exchange);
        let url = '';

        // ✅ Definir URL para cada exchange
        switch (exchange.toLowerCase()) {
            case 'binance':
                url = `https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${formattedAtivo}`;
                break;
            case 'mexc':
                url = `https://contract.mexc.com/api/v1/contract/ticker?symbol=${formattedAtivo}`;
                break;
            case 'gate.io':
                url = `https://api.gateio.ws/api/v4/futures/usdt/tickers`;
                break;
            default:
                this.logger.error(`❌ Exchange ${exchange} não reconhecida.`);
                return { price: 0, fundingRate: 0, volume: 0 };
        }

        // ✅ Requisição à API da exchange
        const response = await axios.get(url, { timeout: 15000 });

        // ✅ Definir o tipo esperado da resposta
        const data = response.data as any;

        // ✅ Verificar se a API retornou um erro
        if (!data || typeof data !== 'object') {
            throw new Error(`❌ Resposta inválida da API ${exchange}`);
        }

        // ✅ Verificar erros específicos das APIs
        if ('code' in data && (data.code === -1121 || data.code === 100002)) {
            throw new Error(`❌ Ativo ${formattedAtivo} não encontrado na ${exchange}`);
        }

        let price = 0;
        let fundingRate = 0;
        let volume = 0;

        // ✅ Extrair dados da resposta da Binance
        if (exchange.toLowerCase() === 'binance') {
            price = parseFloat(data.lastPrice || '0');
            fundingRate = parseFloat(data.fundingRate || '0');
            volume = parseFloat(data.volume || '0');
        }
        // ✅ Extrair dados da resposta da MEXC
        else if (exchange.toLowerCase() === 'mexc') {
            if (!data.data || typeof data.data !== 'object') {
                throw new Error(`❌ Ativo ${formattedAtivo} não encontrado na MEXC`);
            }
            price = parseFloat(data.data.lastPrice || '0');
            fundingRate = parseFloat(data.data.fundingRate || '0');
            volume = parseFloat(data.data.volume || '0');
        }
        // ✅ Extrair dados da resposta da Gate.io
        else if (exchange.toLowerCase() === 'gate.io') {
            const gateData = data.find((item: any) => item.contract === formattedAtivo);
            if (!gateData) {
                throw new Error(`❌ Ativo ${formattedAtivo} não encontrado na Gate.io`);
            }
            price = parseFloat(gateData.last) || 0;
            fundingRate = parseFloat(gateData.funding_rate) || 0;
            volume = parseFloat(gateData.volume) || 0;
        }

        // ✅ Verificar se o preço é válido
        if (!price || price === 0) {
            throw new Error(`❌ Ativo ${formattedAtivo} não possui preço válido na ${exchange}`);
        }

        return { price, fundingRate, volume };
    } catch (error) {
        this.logger.error(`❌ Erro ao buscar preço para ${ativo} na ${exchange}: ${error.message}`);
        return { price: 0, fundingRate: 0, volume: 0 };
    }
  }



  private formatAtivoForExchange(ativo: string, exchange: string): string {
    switch (exchange.toLowerCase()) {
        case 'gate.io':
          return ativo.replace(/(\w+)(USDT)$/, '$1_USDT');
        case 'mexc':
            return ativo.replace(/(\w+)(USDT)$/, '$1_USDT'); // Muda "BTCUSDT" para "BTC_USDT"
        case 'binance':
            return ativo.toUpperCase(); // Binance exige sem separação
        default:
            return ativo.replace('/', ''); // Remove barra para manter padrão
    }
  }



  
}