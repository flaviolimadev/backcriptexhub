import { Controller, Get, Query } from '@nestjs/common';
import { ArbitrageService, BinancePrice, BitgetTicker } from './arbitrage.service';

@Controller('arbitrage') // 🔥 Define o prefixo da rota
export class ArbitrageController {
  constructor(private readonly arbitrageService: ArbitrageService) {}

  @Get('spot-spot')
  async getSpotSpotOpportunities() {
    return this.arbitrageService.getSpotSpotArbitrage();
  }

  @Get('gateio-futures')
  async getGateIoFuturesPrices() {
    return this.arbitrageService.getGateIoFuturesPrices();
  }

  @Get('mexc-futures')
  async getMexcFuturesPrices() {
    return this.arbitrageService.getMexcFuturesPrices();
  }

  @Get('bitget-futures')
  async getBitgetFuturesPrices() {
    return this.arbitrageService.getBitgetFuturesPrices();
  }
  
  @Get('/binance-futures')
  async getBinanceFuturesPrices(): Promise<BinancePrice[]> {
    return this.arbitrageService.getBinanceFuturesPrices();
  }

  @Get('htx-futures')
  async getHtxFuturesPrices() {
    return this.arbitrageService.getHtxFuturesPrices();
  }

  // 🔥 Nova Rota para Analisar Oportunidades de Arbitragem
  @Get('oportunidades-arbitragem')
  async getArbitrageOpportunities() {
    return this.arbitrageService.getArbitrageOpportunities();
  }

  // 🔥 Nova rota para análise de arbitragem entre duas corretoras, agora em tempo real
  @Get('analisar-ativo-realtime')
  async analisarAtivoRealtime(
    @Query('ativo') ativo: string,
    @Query('long') longExage: string,
    @Query('short') shortExage: string,
  ) {
    return this.arbitrageService.analisarArbitragemEntreCorretorasRealtime(ativo, longExage, shortExage);
  }
}
