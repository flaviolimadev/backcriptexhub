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

dotenv.config();

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

  async getGateIoFuturesPrices(): Promise<any[]> {
    try {
        // 🔥 Buscar os ativos cadastrados no banco de dados
        const ativos = await this.ativosRepository.find({ where: { status: 1 } });

        // 🔥 Converter os nomes dos ativos para o formato esperado pela API (BTCUSDT → BTC_USDT)
        const coinsOfInterest = ativos.map(ativo => ativo.name.replace(/(\w+)(USDT)/, '$1_USDT'));

        // 🔥 Buscar os preços dos ativos futuros na Gate.io
        const response = await axios.get<{ contract: string; last: string; highest_price_24h: string; lowest_price_24h: string; funding_rate: string; change_percent: string; }[]>(this.gateIoAPI);

        // 🔥 Buscar os contratos futuros para pegar volume mínimo e máximo
        const contractsResponse = await axios.get<{ name: string; order_size_min: string; order_size_max: string; order_value_min: string; order_value_max: string; }[]>(this.gateIoContractsAPI);

        // 🔥 Criar um mapa de volumes mínimos e máximos para consulta rápida
        const contractMap = new Map(contractsResponse.data.map(contract => [
            contract.name, 
            {
                min_size: contract.order_size_min,  // Volume mínimo em moeda
                max_size: contract.order_size_max,  // Volume máximo em moeda
                min_notional: contract.order_value_min, // Volume mínimo em USDT
                max_notional: contract.order_value_max, // Volume máximo em USDT
            }
        ]));

        // 🔥 Filtrar os pares desejados e incluir volume mínimo/máximo
        const futuresPrices = await Promise.all(response.data
            .filter(item => coinsOfInterest.includes(item.contract))
            .map(async (item) => {
                const contractInfo = contractMap.get(item.contract) || {
                    min_size: "N/A",
                    max_size: "N/A",
                    min_notional: "N/A",
                    max_notional: "N/A",
                };

                // 🔥 Buscar os registros correspondentes no banco
                const ativo = await this.ativosRepository.findOne({ where: { name: item.contract.replace('_', '') } });
                const exage = await this.exageRepository.findOne({ where: { id: 2 } }); // 🔥 Gate.io ID = 2

                if (!ativo || !exage) return null;

                // 🔥 Evita NaN no volume
                const volumValue = parseFloat(contractInfo.max_notional);
                const validVolum = isNaN(volumValue) ? 0 : volumValue;

                // 🔥 Verifica se já existe um registro na tabela `precings`
                let existingPrcing = await this.prcingRepository.findOne({
                    where: { ativo: { id: ativo.id }, exage: { id: exage.id } }
                });

                if (existingPrcing) {
                    // 🔥 Atualiza os dados da linha existente para evitar duplicação
                    existingPrcing.precing = parseFloat(item.last);
                    existingPrcing.volum = validVolum;
                    existingPrcing.updated_at = new Date(); // Atualiza a data de modificação
                    await this.prcingRepository.save(existingPrcing);
                } else {
                    // 🔥 Cria um novo registro caso não exista
                    const newPrcing = this.prcingRepository.create({
                        ativo: ativo,
                        exage: exage,
                        precing: parseFloat(item.last),
                        type: 1, // Mercado futuro
                        volum: validVolum,
                        status: 1,
                        created_at: new Date(),
                        updated_at: new Date(),
                    });
                    await this.prcingRepository.save(newPrcing);
                }

                // 🔥 Gerar timestamp da coleta
                const now = new Date();
                now.setSeconds(0, 0); // Remove segundos e milissegundos para agrupar por minuto

                // 🔥 Verificar se já existe um histórico no mesmo minuto
                let existingHistory = await this.prcingHistoryRepository.findOne({
                    where: { ativo: { id: ativo.id }, exage: { id: exage.id }, timestamp: now }
                });

                if (existingHistory) {
                    // 🔥 Atualiza o preço no histórico se já existir um no mesmo minuto
                    existingHistory.precing = parseFloat(item.last);
                    await this.prcingHistoryRepository.save(existingHistory);
                } else {
                    // 🔥 Insere um novo registro no histórico
                    const newHistory = this.prcingHistoryRepository.create({
                        ativo: ativo,
                        exage: exage,
                        precing: parseFloat(item.last),
                        timestamp: now,
                    });
                    await this.prcingHistoryRepository.save(newHistory);
                }

                return {
                    pair: item.contract.replace('_', '/'),
                    last_price: item.last,
                    highest_price_24h: item.highest_price_24h,
                    lowest_price_24h: item.lowest_price_24h,
                    funding_rate: item.funding_rate,
                    change_24h: item.change_percent,
                    min_size: contractInfo.min_size,
                    max_size: contractInfo.max_size,
                    min_notional: contractInfo.min_notional,
                    max_notional: contractInfo.max_notional,
                };
            })
        );

        return futuresPrices.filter(price => price !== null);
    } catch (error) {
        console.error('❌ Erro ao buscar preços futuros da Gate.io:', error.message);
        return [];
    } 
  }


async getMexcFuturesPrices(): Promise<any[]> {
    try {
        // 🔥 Buscar os ativos cadastrados no banco de dados
        const ativos = await this.ativosRepository.find({ where: { status: 1 } });

        // 🔥 Converter os nomes dos ativos para o formato esperado pela API (BTCUSDT → BTC_USDT)
        const coinsOfInterest = ativos.map(ativo => ativo.name.replace(/(\w+)(USDT)/, '$1_USDT'));

        // 🔥 Buscar os preços dos ativos futuros na MEXC
        const response = await axios.get<{ data: { symbol: string; lastPrice: string; highPrice24h: string; lowPrice24h: string; fundingRate: string; priceChangePercent: string; }[] }>(this.mexcAPI);
        const pricesData = response.data.data || [];

        // 🔥 Buscar os contratos futuros para pegar volume mínimo e máximo
        const contractsResponse = await axios.get<{ data: { symbol: string; minVol: string; maxVol: string; minAmount: string; maxAmount: string; }[] }>(this.mexcContractsAPI);
        const contractsData = contractsResponse.data.data || [];

        // 🔥 Criar um mapa de volumes mínimos e máximos para consulta rápida
        const contractMap = new Map(contractsData.map(contract => [
            contract.symbol, 
            {
                min_size: contract.minVol || "N/A",  // Volume mínimo em moeda
                max_size: contract.maxVol || "N/A",  // Volume máximo em moeda
                min_notional: contract.minAmount || "N/A", // Volume mínimo em USDT
                max_notional: contract.maxAmount || "N/A", // Volume máximo em USDT
            }
        ]));

        // 🔥 Iterar pelos ativos e atualizar/inserir no banco de dados
        const futuresPrices = await Promise.all(pricesData
            .filter(item => coinsOfInterest.includes(item.symbol))
            .map(async (item) => {
                const contractInfo = contractMap.get(item.symbol) || {
                    min_size: "N/A",
                    max_size: "N/A",
                    min_notional: "N/A",
                    max_notional: "N/A",
                };

                // 🔥 Buscar os registros correspondentes no banco
                const ativo = await this.ativosRepository.findOne({ where: { name: item.symbol.replace('_', '') } });
                const exage = await this.exageRepository.findOne({ where: { id: 3 } }); // 🔥 MEXC ID = 3

                if (!ativo || !exage) return null;

                // 🔥 Evita NaN no volume
                const volumValue = parseFloat(contractInfo.max_notional);
                const validVolum = isNaN(volumValue) ? 0 : volumValue;
                const currentTimestamp = new Date();
                const currentMinute = currentTimestamp.getMinutes();

                // 🔥 Verifica se já existe um registro na tabela `precings`
                let existingPrcing = await this.prcingRepository.findOne({
                    where: { ativo: { id: ativo.id }, exage: { id: exage.id } }
                });

                if (existingPrcing) {
                    // 🔥 Atualiza os dados da linha existente para evitar duplicação
                    existingPrcing.precing = parseFloat(item.lastPrice);
                    existingPrcing.volum = validVolum;
                    existingPrcing.updated_at = currentTimestamp;
                    await this.prcingRepository.save(existingPrcing);
                } else {
                    // 🔥 Cria um novo registro caso não exista
                    const newPrcing = this.prcingRepository.create({
                        ativo: ativo,
                        exage: exage,
                        precing: parseFloat(item.lastPrice),
                        type: 1, // Mercado futuro
                        volum: validVolum,
                        status: 1,
                        created_at: currentTimestamp,
                        updated_at: currentTimestamp,
                    });
                    await this.prcingRepository.save(newPrcing);
                }

                // 🔥 Verifica se já existe um registro no histórico para esse ativo na MEXC no mesmo minuto
                let existingHistory = await this.prcingHistoryRepository.findOne({
                    where: { 
                        ativo: { id: ativo.id }, 
                        exage: { id: exage.id },
                    },
                    order: { timestamp: "DESC" } // 🔥 Pega o registro mais recente
                });

                if (!existingHistory || new Date(existingHistory.timestamp).getMinutes() !== currentMinute) {
                    // 🔥 Cria um novo registro no histórico apenas se não houver um registro do mesmo minuto
                    const newHistory = this.prcingHistoryRepository.create({
                        ativo: ativo,
                        exage: exage,
                        precing: parseFloat(item.lastPrice),
                        timestamp: currentTimestamp,
                    });
                    await this.prcingHistoryRepository.save(newHistory);
                }

                return {
                    pair: item.symbol.replace('_', '/'),
                    last_price: item.lastPrice,
                    highest_price_24h: item.highPrice24h,
                    lowest_price_24h: item.lowPrice24h,
                    funding_rate: item.fundingRate,
                    change_24h: item.priceChangePercent,
                    min_size: contractInfo.min_size,
                    max_size: contractInfo.max_size,
                    min_notional: contractInfo.min_notional,
                    max_notional: contractInfo.max_notional,
                };
            })
        );

        return futuresPrices.filter(price => price !== null);
    } catch (error) {
        console.error('❌ Erro ao buscar preços futuros da MEXC:', error.message);
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

  async getBinanceFuturesPrices(): Promise<BinancePrice[]> {
    try {
        this.logger.log('🔍 Buscando preços da Binance (Futuros USDT-M)...');

        // 🔥 Buscar os ativos cadastrados no banco de dados
        const ativos = await this.ativosRepository.find({ where: { status: 1 } });

        // 🔥 Buscar os preços dos ativos futuros na Binance
        const response = await axios.get(this.binanceFuturesAPI);
        const pricesData = Array.isArray(response.data) ? response.data : [];

        // 🔥 Buscar os contratos futuros para pegar volume mínimo e máximo
        const contractsResponse = await axios.get(this.binanceContractsAPI);
        const contractsData = (contractsResponse.data as any).symbols || [];

        // 🔥 Criar um tipo explícito para contratos
        interface BinanceContractInfo {
            min_size: string;
            max_size: string;
            min_notional: string;
        }

        // 🔥 Criar um mapa de volumes mínimos e máximos para consulta rápida
        const contractMap = new Map<string, BinanceContractInfo>(
            contractsData.map(contract => [
                contract.symbol,
                {
                    min_size: contract.filters.find(f => f.filterType === "LOT_SIZE")?.minQty || "N/A",
                    max_size: contract.filters.find(f => f.filterType === "LOT_SIZE")?.maxQty || "N/A",
                    min_notional: contract.filters.find(f => f.filterType === "MIN_NOTIONAL")?.notional || "N/A",
                }
            ])
        );

        const processedData: BinancePrice[] = [];
        const currentTimestamp = new Date();
        const currentMinute = currentTimestamp.getMinutes();

        for (const item of pricesData) {
            const contractInfo: BinanceContractInfo = contractMap.get(item.symbol) || {
                min_size: "N/A",
                max_size: "N/A",
                min_notional: "N/A",
            };

            // 🔥 Buscar o ativo correspondente no banco de dados
            let ativo = await this.ativosRepository.findOne({ where: { name: item.symbol } });

            if (!ativo) {
                this.logger.log(`➕ Adicionando novo ativo: ${item.symbol}`);
                ativo = this.ativosRepository.create({ name: item.symbol, status: 1 });
                await this.ativosRepository.save(ativo);
            }

            // 🔥 Buscar a corretora Binance (exageId = 1)
            const exage = await this.exageRepository.findOne({ where: { id: 1 } });
            if (!exage) {
                this.logger.error('❌ Erro: Corretora Binance não encontrada no banco de dados!');
                continue;
            }

            // 🔥 Evita NaN no volume, usa `min_notional` caso `max_notional` não exista
            const volumValue = parseFloat(contractInfo.min_notional);
            const validVolum = isNaN(volumValue) ? 0 : volumValue;

            // 🔥 Verifica se já existe um registro na tabela `precings`
            let existingPrcing = await this.prcingRepository.findOne({
                where: { ativo: { id: ativo.id }, exage: { id: exage.id } }
            });

            if (existingPrcing) {
                // 🔥 Atualiza os dados da linha existente para evitar duplicação
                existingPrcing.precing = parseFloat(item.lastPrice);
                existingPrcing.volum = validVolum;
                existingPrcing.updated_at = currentTimestamp;
                await this.prcingRepository.save(existingPrcing);
            } else {
                // 🔥 Cria um novo registro caso não exista
                const newPrcing = this.prcingRepository.create({
                    ativo: ativo,
                    exage: exage,
                    precing: parseFloat(item.lastPrice),
                    type: 1, // Mercado futuro
                    volum: validVolum,
                    status: 1,
                    created_at: currentTimestamp,
                    updated_at: currentTimestamp,
                });
                await this.prcingRepository.save(newPrcing);
            }

            // 🔥 Verifica se já existe um registro no histórico para esse ativo na Binance no mesmo minuto
            let existingHistory = await this.prcingHistoryRepository.findOne({
                where: { 
                    ativo: { id: ativo.id }, 
                    exage: { id: exage.id },
                },
                order: { timestamp: "DESC" } // 🔥 Pega o registro mais recente
            });

            if (!existingHistory || new Date(existingHistory.timestamp).getMinutes() !== currentMinute) {
                // 🔥 Cria um novo registro no histórico apenas se não houver um registro do mesmo minuto
                const newHistory = this.prcingHistoryRepository.create({
                    ativo: ativo,
                    exage: exage,
                    precing: parseFloat(item.lastPrice),
                    timestamp: currentTimestamp,
                });
                await this.prcingHistoryRepository.save(newHistory);
            }

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

        return processedData;
    } catch (error) {
        this.logger.error('❌ Erro ao buscar preços da Binance:', error.response?.data || error.message);
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

        // 🔥 Buscar todos os preços armazenados no banco de dados
        const precings = await this.prcingRepository.find({
            relations: ['ativo', 'exage'], // 🔥 Traz os relacionamentos para acessar nome do ativo e corretora
        });

        // 🔥 Organizar os preços por ativo
        const precingsByAtivo: Record<string, any[]> = {};
        precings.forEach((p) => {
            const ativoName = p.ativo.name;
            if (!precingsByAtivo[ativoName]) {
                precingsByAtivo[ativoName] = [];
            }
            precingsByAtivo[ativoName].push(p);
        });

        const oportunidades: any[] = [];

        for (const ativo in precingsByAtivo) {
            const precings = precingsByAtivo[ativo];

            // 🔥 Encontrar a corretora com menor e maior preço
            const compra = precings.reduce((min, p) => (Number(p.precing) < Number(min.precing) ? p : min), precings[0]);
            const venda = precings.reduce((max, p) => (Number(p.precing) > Number(max.precing) ? p : max), precings[0]);

            if (compra && venda && Number(compra.precing) < Number(venda.precing)) {
                // 🔥 Garantindo que o valor seja tratado como número
                const precoCompra = Number(compra.precing);
                const precoVenda = Number(venda.precing);
                const spread = ((precoVenda - precoCompra) / precoCompra) * 100;

                // 🔥 Tempo de atualização em minutos
                const atualizado = Math.floor((Date.now() - new Date(compra.updated_at).getTime()) / 60000);

                oportunidades.push({
                    Moeda: ativo,
                    Compra: compra.exage.name,
                    Venda: venda.exage.name,
                    Precing_Compra: precoCompra.toFixed(4),
                    Precing_Venda: precoVenda.toFixed(4),
                    Spread: spread.toFixed(2) + '%',
                    Atualizado: atualizado + ' min atrás',
                });
            }
        }

        return oportunidades;
    } catch (error) {
        this.logger.error('❌ Erro ao calcular oportunidades de arbitragem:', error.message);
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
