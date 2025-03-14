import { Controller, Get, Query, Param, Logger  } from '@nestjs/common';
import { ArbitrageService, BinancePrice, BitgetTicker } from './arbitrage.service';

@Controller('arbitrage') // 🔥 Define o prefixo da rota
export class ArbitrageController {

  private readonly logger = new Logger(ArbitrageController.name);

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

  @Get('/live/:ativo/:exchange1/:exchange2')
async getLiveArbitrage(
    @Param('ativo') ativo: string,
    @Param('exchange1') exchange1: string,
    @Param('exchange2') exchange2: string,
): Promise<any> {
    try {
        this.logger.log(`🔍 Buscando arbitragem entre ${exchange1} e ${exchange2} para ${ativo}...`);

        const longData = await this.arbitrageService.getPriceFromExchange2(ativo, exchange1);
        const shortData = await this.arbitrageService.getPriceFromExchange2(ativo, exchange2);

        if (!longData.price || !shortData.price) {
            return {
                error: `❌ Dados não disponíveis para ${exchange1} ou ${exchange2}.`,
                detalhes: {
                    [`${exchange1}`]: longData.price === 0 ? "❌ Ativo não encontrado" : "✅ Dados OK",
                    [`${exchange2}`]: shortData.price === 0 ? "❌ Ativo não encontrado" : "✅ Dados OK",
                }
            };
        }

        const compraExchange = longData.price < shortData.price ? exchange1 : exchange2;
        const vendaExchange = longData.price > shortData.price ? exchange1 : exchange2;
        const precoCompra = Math.min(longData.price, shortData.price);
        const precoVenda = Math.max(longData.price, shortData.price);
        const spread = ((precoVenda - precoCompra) / precoCompra) * 100;

        return {
            Moeda: ativo,
            Compra: compraExchange,
            Venda: vendaExchange,
            Preco_Compra: precoCompra.toFixed(4),
            Preco_Venda: precoVenda.toFixed(4),
            Spread: spread.toFixed(2) + '%',
            Volume_Compra: Math.min(longData.volume, shortData.volume).toFixed(4),
            Volume_Venda: Math.max(longData.volume, shortData.volume).toFixed(4),
            FundingRate_Compra: longData.fundingRate.toFixed(6),
            FundingRate_Venda: shortData.fundingRate.toFixed(6),
        };
    } catch (error) {
        this.logger.error('❌ Erro ao buscar arbitragem em tempo real:', error.message);
        return { error: 'Erro ao processar a solicitação' };
    }
}

}
