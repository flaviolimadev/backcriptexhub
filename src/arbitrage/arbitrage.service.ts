import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import { Ativo } from '../ativos/entities/ativo.entity'; // Importando a entidade Ativo
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Exage } from '../exages/exage.entity';
import { Prcing  } from '../precing/entities/prcing.entity'; // 🔥 Importando a entidade Precing
import { PrcingHistoryService } from '../precingHistory/prcingHistory.service';
import { PrcingHistory } from '../precingHistory/prcingHistory.entity'; // 🔥 Importando a entidade
import { HttpsProxyAgent } from 'https-proxy-agent'; // 🔥 Suporte a proxy
import { Cron } from '@nestjs/schedule';

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


  private bitgetTickersAPI = 'https://api.bitget.com/api/v2/mix/market/tickers';
  private bitgetContractsAPI = 'https://api.bitget.com/api/v2/mix/market/contracts';
  private marketType = 'umcbl'; // 🔥 Correto para USDT-Margined Futures na Bitget

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

    @Cron('*/40 * * * * *')  // Executa a cada 20 segundos
    async getGateIoFuturesPrices(): Promise<any[]> {
        try {
          this.logger.log('🔍 Buscando preços futuros da Gate.io...');
      
          // 🔥 Buscar os ativos cadastrados no banco de dados (somente ID e nome para reduzir carga)
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
            axios.get<{ contract: string; last: string; highest_price_24h: string; lowest_price_24h: string; funding_rate: string; change_percent: string; }[]>(this.gateIoAPI),
            axios.get<{ name: string; order_size_min: string; order_size_max: string; order_value_min: string; order_value_max: string; }[]>(this.gateIoContractsAPI)
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
      
          // 🔥 Buscar a exchange Gate.io (evita busca repetitiva)
          const exage = await this.exageRepository.findOne({ where: { id: 2 } });
          if (!exage) {
            this.logger.error('❌ Erro: Exchange Gate.io não encontrada no banco de dados.');
            return [];
          }
      
          const now = new Date();
          now.setSeconds(0, 0); // Remove segundos e milissegundos para agrupar por minuto
      
          // 🔥 Definir tipos explícitos para os arrays de batch
          const bulkUpdates: { id: number; precing: number; volum: number; updated_at: Date }[] = [];
          const bulkInserts: { ativo: { id: number }; exage: { id: number }; precing: number; type: number; volum: number; status: number; created_at: Date; updated_at: Date }[] = [];
          const bulkHistory: { ativo: { id: number }; exage: { id: number }; precing: number; timestamp: Date }[] = [];
      
          for (const item of pricesData) {
            const ativoId = ativosMap.get(item.contract);
            if (!ativoId) continue; // 🔥 Ignorar ativos não cadastrados
      
            const contractInfo = contractMap.get(item.contract) || {
              min_size: "N/A",
              max_size: "N/A",
              min_notional: "N/A",
              max_notional: "N/A"
            };
      
            const validVolum = parseFloat(contractInfo.max_notional) || 0;
            const lastPrice = parseFloat(item.last) || 0;
      
            // 🔥 Verifica se já existe um registro na tabela `precings`
            const existingPrcing = await this.prcingRepository.findOne({
              select: ['id', 'precing', 'volum'],
              where: { ativo: { id: ativoId }, exage: { id: exage.id } }
            });
      
            if (existingPrcing) {
              bulkUpdates.push({
                id: existingPrcing.id,
                precing: lastPrice,
                volum: validVolum,
                updated_at: now
              });
            } else {
              bulkInserts.push({
                ativo: { id: ativoId },
                exage: { id: exage.id },
                precing: lastPrice,
                type: 1,
                volum: validVolum,
                status: 1,
                created_at: now,
                updated_at: now
              });
            }
      
            // 🔥 Verifica se já existe um registro no histórico para esse ativo na Gate.io no mesmo minuto
            const existingHistory = await this.prcingHistoryRepository.findOne({
              where: { ativo: { id: ativoId }, exage: { id: exage.id } },
              order: { timestamp: "DESC" }
            });
      
            if (!existingHistory || new Date(existingHistory.timestamp).getMinutes() !== now.getMinutes()) {
              bulkHistory.push({
                ativo: { id: ativoId },
                exage: { id: exage.id },
                precing: lastPrice,
                timestamp: now
              });
            }
          }
      
          // 🔥 Realizar inserções e atualizações em batch para evitar carga excessiva no banco
          if (bulkUpdates.length > 0) {
            await this.prcingRepository.save(bulkUpdates);
          }
          if (bulkInserts.length > 0) {
            await this.prcingRepository.save(bulkInserts);
          }
          if (bulkHistory.length > 0) {
            await this.prcingHistoryRepository.save(bulkHistory);
          }
      
          this.logger.log(`✅ Atualizados ${bulkUpdates.length}, Inseridos ${bulkInserts.length}, Histórico ${bulkHistory.length}`);
      
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
      

    @Cron('*/41 * * * * *')  // Executa a cada 20 segundos
    async getMexcFuturesPrices(): Promise<any[]> {
        try {
          this.logger.log('🔍 Buscando preços futuros da MEXC...');
      
          // 🔥 Buscar os nomes dos ativos cadastrados para reduzir a carga no banco
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
      
          // 🔥 Buscar os preços dos ativos futuros na MEXC
          const [pricesResponse, contractsResponse] = await Promise.all([
            axios.get<{ data: { symbol: string; lastPrice: string; highPrice24h: string; lowPrice24h: string; fundingRate: string; priceChangePercent: string; }[] }>(this.mexcAPI),
            axios.get<{ data: { symbol: string; minVol: string; maxVol: string; minAmount: string; maxAmount: string; }[] }>(this.mexcContractsAPI)
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
      
          // 🔥 Buscar a exchange MEXC (evita busca repetitiva)
          const exage = await this.exageRepository.findOne({ where: { id: 3 } });
          if (!exage) {
            this.logger.error('❌ Erro: Exchange MEXC não encontrada no banco de dados.');
            return [];
          }
      
          const now = new Date();
          const currentMinute = now.getMinutes();
      
          // 🔥 Definir tipos explícitos para os arrays de batch
          const bulkUpdates: { id: number; precing: number; volum: number; updated_at: Date }[] = [];
          const bulkInserts: { ativo: { id: number }; exage: { id: number }; precing: number; type: number; volum: number; status: number; created_at: Date; updated_at: Date }[] = [];
          const bulkHistory: { ativo: { id: number }; exage: { id: number }; precing: number; timestamp: Date }[] = [];
      
          for (const item of pricesData) {
            const ativoId = ativosMap.get(item.symbol);
            if (!ativoId) continue; // 🔥 Ignorar ativos não cadastrados
      
            const contractInfo = contractMap.get(item.symbol) || {
              min_size: "N/A",
              max_size: "N/A",
              min_notional: "N/A",
              max_notional: "N/A"
            };
      
            const validVolum = parseFloat(contractInfo.max_notional) || 0;
            const lastPrice = parseFloat(item.lastPrice) || 0;
      
            // 🔥 Verifica se já existe um registro na tabela `precings`
            const existingPrcing = await this.prcingRepository.findOne({
              select: ['id', 'precing', 'volum'],
              where: { ativo: { id: ativoId }, exage: { id: exage.id } }
            });
      
            if (existingPrcing) {
              bulkUpdates.push({
                id: existingPrcing.id,
                precing: lastPrice,
                volum: validVolum,
                updated_at: now
              });
            } else {
              bulkInserts.push({
                ativo: { id: ativoId },
                exage: { id: exage.id },
                precing: lastPrice,
                type: 1,
                volum: validVolum,
                status: 1,
                created_at: now,
                updated_at: now
              });
            }
      
            // 🔥 Verifica se já existe um registro no histórico para esse ativo na MEXC no mesmo minuto
            const existingHistory = await this.prcingHistoryRepository.findOne({
              where: { ativo: { id: ativoId }, exage: { id: exage.id } },
              order: { timestamp: "DESC" }
            });
      
            if (!existingHistory || new Date(existingHistory.timestamp).getMinutes() !== currentMinute) {
              bulkHistory.push({
                ativo: { id: ativoId },
                exage: { id: exage.id },
                precing: lastPrice,
                timestamp: now
              });
            }
          }
      
          // 🔥 Realizar inserções e atualizações em batch para evitar carga excessiva no banco
          if (bulkUpdates.length > 0) {
            await this.prcingRepository.save(bulkUpdates);
          }
          if (bulkInserts.length > 0) {
            await this.prcingRepository.save(bulkInserts);
          }
          if (bulkHistory.length > 0) {
            await this.prcingHistoryRepository.save(bulkHistory);
          }
      
          this.logger.log(`✅ Atualizados ${bulkUpdates.length}, Inseridos ${bulkInserts.length}, Histórico ${bulkHistory.length}`);
      
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
      
      

    async getBitgetFuturesPrices(): Promise<BitgetTicker[]> {
    const timestamp = String(Date.now());
    const productType = 'umcbl'; // 🔥 Definindo explicitamente o tipo de mercado

    try {
        console.log(`🔍 Buscando dados da Bitget com productType=${productType}...`);

        const response = await axios.get<BitgetApiResponse<BitgetTicker[]>>(this.bitgetTickersAPI, {
        params: { productType }, // 🔥 Garantindo que 'productType' não está vazio
        headers: {
            'ACCESS-KEY': BITGET_API_KEY!,
            'ACCESS-SIGN': this.generateSignature(timestamp),
            'ACCESS-TIMESTAMP': timestamp,
            'ACCESS-PASSPHRASE': BITGET_PASSPHRASE!,
            'Content-Type': 'application/json',
        },
        });

        if (response.data.code === '00000') {
        console.log(`✅ Sucesso ao buscar dados da Bitget.`);
        return response.data.data;
        }

        console.warn(`⚠️ Erro ao buscar dados:`, response.data.msg);
        return [];
    } catch (error) {
        console.error(`❌ Erro ao buscar dados da Bitget:`, error.response?.data || error.message);
        return [];
    }
    }

    @Cron('*/60 * * * * *')  // 🔥 Executa a cada 15 segundos
    async getBinanceFuturesPrices(): Promise<BinancePrice[]> {
        try {
          this.logger.log('🔍 Buscando preços da Binance...');
    
          const axiosConfig = {
            httpsAgent: proxyAgent,
            timeout: 15000,
          };
    
          const [ativos, exages, response, contractsResponse] = await Promise.all([
            this.ativosRepository.find({ where: { status: 1 } }),
            this.exageRepository.find(),
            axios.get(this.binanceFuturesAPI, axiosConfig),
            axios.get(this.binanceContractsAPI, axiosConfig),
          ]);
    
          if (!Array.isArray(response.data)) {
            throw new Error('Dados da Binance não estão no formato esperado.');
          }
    
          const ativosMap = new Map(ativos.map(a => [a.name, a]));
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
    
          const pricesData = response.data;
          const processedData: BinancePrice[] = [];
          const now = new Date();
    
          for (const item of pricesData) {
            const ativo = ativosMap.get(item.symbol);
            if (!ativo) continue;
    
            const contractInfo = contractMap.get(item.symbol) || {
              min_size: "N/A",
              max_size: "N/A",
              min_notional: "N/A",
            };
    
            processedData.push({
              pair: item.symbol,
              last_price: item.lastPrice,
              highest_price_24h: item.highPrice,
              lowest_price_24h: item.lowPrice,
              funding_rate: item.fundingRate || "N/A",
              change_24h: item.priceChangePercent,
              min_size: contractInfo.min_size,
              max_size: contractInfo.max_size,
              min_notional: contractInfo.min_notional,
            });
          }
    
          this.logger.log(`✅ Preços da Binance atualizados (${processedData.length} ativos processados).`);
          return processedData;
        } catch (error) {
          this.logger.error(`❌ Erro ao buscar preços da Binance: ${error.message}`);
          return [];
        }
      }


    async getHtxFuturesPrices(): Promise<any[]> {
    try {
        console.log('🔍 Buscando preços da HTX (Huobi Futuros USDT-M)...');

        // 🔥 Buscar preços dos ativos futuros da HTX
        const response = await axios.get<{ data: any[] }>('https://api.huobi.pro/market/tickers');
        const pricesData = (response.data as { data: any[] }).data || [];

        // 🔥 Buscar os contratos futuros para pegar volume mínimo e máximo
        const contractsResponse = await axios.get<{ data: any[] }>('https://api.hbdm.com/api/v1/contract_contract_info');
        const contractsData = (contractsResponse.data as { data: any[] }).data || [];

        // 🔥 Lista de moedas de interesse
        const coinsOfInterest = ['BTC-USDT', 'ETH-USDT', 'BNB-USDT', 'ADA-USDT'];

        // 🔥 Criar um mapa de volumes mínimos e máximos para consulta rápida
        interface HtxContractInfo {
        min_size: string;
        max_size: string;
        min_notional: string;
        }

        const contractMap = new Map<string, HtxContractInfo>(
        contractsData.map(contract => [
            contract.symbol,
            {
            min_size: contract.contract_size || "N/A",   // 🔥 Volume mínimo em moeda
            max_size: contract.max_order_limit || "N/A", // 🔥 Volume máximo em moeda
            min_notional: contract.min_order_limit || "N/A", // 🔥 Volume mínimo em USDT
            }
        ])
        );

        // 🔥 Filtrar os pares desejados e incluir volume mínimo/máximo
        return pricesData
        .filter((item) => coinsOfInterest.includes(item.symbol))
        .map((item) => {
            const contractInfo: HtxContractInfo = contractMap.get(item.symbol) || {
            min_size: "N/A",
            max_size: "N/A",
            min_notional: "N/A",
            };

            return {
            pair: item.symbol.replace('-', '/'),
            last_price: item.close,
            highest_price_24h: item.high,
            lowest_price_24h: item.low,
            change_24h: item.change,
            min_size: contractInfo.min_size,
            max_size: contractInfo.max_size,
            min_notional: contractInfo.min_notional,
            };
        });

    } catch (error) {
        console.error('❌ Erro ao buscar preços da HTX:', error.response?.data || error.message);
        return [];
    }
    }


    async getArbitrageOpportunities(): Promise<any[]> {
        try {
          this.logger.log('🔍 Analisando oportunidades de arbitragem...');
      
          // 🔥 Buscar apenas os dados essenciais do banco para reduzir a carga
          const precings = await this.prcingRepository.find({
            select: ['precing', 'updated_at'],
            relations: ['ativo', 'exage'],
          });
      
          if (precings.length === 0) {
            this.logger.warn('⚠️ Nenhum dado de preço disponível para análise.');
            return [];
          }
      
          const precingsByAtivo = new Map<string, any[]>();
          for (const p of precings) {
            const ativoName = p.ativo.name;
            if (!precingsByAtivo.has(ativoName)) {
              precingsByAtivo.set(ativoName, []);
            }
            precingsByAtivo.get(ativoName)!.push(p);
          }
      
          const oportunidades: any[] = [];
          const agora = Date.now(); // Calcula apenas uma vez
      
          for (const [ativo, precings] of precingsByAtivo.entries()) {
            if (precings.length < 2) continue; // Ignora ativos sem ao menos 2 preços
      
            // 🔥 Encontrar menor (compra) e maior (venda) preço de forma eficiente
            let compra = precings[0];
            let venda = precings[0];
      
            for (const p of precings) {
              if (Number(p.precing) < Number(compra.precing)) compra = p;
              if (Number(p.precing) > Number(venda.precing)) venda = p;
            }
      
            // 🔥 Se não há spread positivo, ignora a oportunidade
            if (Number(compra.precing) >= Number(venda.precing)) continue;
      
            const precoCompra = Number(compra.precing);
            const precoVenda = Number(venda.precing);
            const spread = ((precoVenda - precoCompra) / precoCompra) * 100;
      
            // 🔥 Calcula a atualização apenas uma vez
            const atualizado = Math.floor((agora - new Date(compra.updated_at).getTime()) / 1000);
      
            oportunidades.push({
              Moeda: ativo,
              Compra: compra.exage.name,
              Venda: venda.exage.name,
              Precing_Compra: precoCompra.toFixed(4),
              Precing_Venda: precoVenda.toFixed(4),
              Spread: spread.toFixed(2) + '%',
              Atualizado: `${atualizado} segundos atrás`,
            });
          }
      
          this.logger.log(`✅ Oportunidades encontradas: ${oportunidades.length}`);
          return oportunidades;
        } catch (error) {
          this.logger.error(`❌ Erro ao calcular oportunidades de arbitragem: ${error.message}`);
          return [];
        }
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


    async getPriceFromExchange(ativo: string, exchange: string): Promise<{ price: number; fundingRate: number; volume: number }> {
    try {
        let url = '';
        let priceKey = '';
        let fundingRateKey = '';
        let volumeKey = '';

        // 🔥 Ajustar formato do ativo para corretoras específicas
        const formattedAtivo =
            exchange.toLowerCase() === 'gate.io' || exchange.toLowerCase() === 'mexc'
                ? ativo.replace(/(\w+)(USDT)$/, '$1_USDT')
                : ativo;

        switch (exchange.toLowerCase()) {
            case 'binance':
                url = `https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${formattedAtivo}`;
                priceKey = 'lastPrice';
                fundingRateKey = 'fundingRate';
                volumeKey = 'volume';
                break;
            case 'gate.io':
                url = `https://api.gateio.ws/api/v4/futures/usdt/tickers?contract=${formattedAtivo}`;
                priceKey = 'last';
                fundingRateKey = 'funding_rate';
                volumeKey = 'volume';
                break;
            case 'mexc':
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


    async getHistoricalPrices(ativo: string, exchange: string): Promise<any[]> {
    try {
        this.logger.log(`🔍 Buscando os últimos preços disponíveis para ${ativo} na ${exchange}...`);

        let url = '';

        // 🔥 Ajustar formato do ativo para corretoras específicas (Gate.io e MEXC exigem BTC_USDT)
        const formattedAtivo = exchange.toLowerCase() === 'gate.io' || exchange.toLowerCase() === 'mexc'
            ? ativo.replace(/(\w+)(USDT)$/, '$1_USDT') 
            : ativo;

        switch (exchange.toLowerCase()) {
            case 'binance':
                url = `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${formattedAtivo}`;
                break;
            case 'gate.io':
                url = `https://api.gateio.ws/api/v4/futures/usdt/tickers`;
                break;
            case 'mexc':
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
        if (exchange.toLowerCase() === 'binance' && typeof response.data === 'object' && 'price' in response.data) {
            priceData = {
                price: parseFloat((response.data as { price: string }).price).toString(),
                timestamp: Date.now()
            };
        }

        if (exchange.toLowerCase() === 'gate.io' && Array.isArray(response.data)) {
            const gateData = response.data.find((item: any) => item.contract === formattedAtivo);
            if (gateData && typeof gateData === 'object' && 'last' in gateData) {
                priceData = {
                    price: parseFloat(gateData.last).toString(),
                    timestamp: Date.now()
                };
            }
        }

        if (exchange.toLowerCase() === 'mexc' && typeof response.data === 'object' && response.data.hasOwnProperty('data')) {
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
  
}
