import { Controller, Post, Put,Get, Body, Param } from '@nestjs/common';
import { EstrategiaService } from './estrategia.service';

@Controller('estrategias')
export class EstrategiaController {
  constructor(private readonly estrategiaService: EstrategiaService) {}

  // ✅ Criar uma nova estratégia SEM autenticação
  @Post()
  async create(@Body() body: { userId: number; name: string; json: object }) {
    return await this.estrategiaService.createEstrategia(body.userId, body.name, body.json);
  }

  // ✅ Editar uma estratégia existente SEM autenticação
  @Put(':id')
    async update(
    @Param('id') id: number, 
    @Body() body: { name: string; json: object }
    ) {
    try {
        return await this.estrategiaService.updateEstrategia(id, body.name, body.json);
    } catch (error) {
        return { error: error.message };
    }
  }

  // ✅ Retornar todas as estratégias de um usuário específico SEM autenticação
  @Get('/user/:userId')
  async getUserStrategies(@Param('userId') userId: number) {
    return await this.estrategiaService.getUserEstrategias(userId);
  }
}
