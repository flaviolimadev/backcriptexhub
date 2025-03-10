import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { AcoesAulaService } from './acoes_aula.service';

@Controller('acoes-aula')
export class AcoesAulaController {
  constructor(private readonly acoesAulaService: AcoesAulaService) {}

  // Criar ou atualizar uma ação de um usuário em uma aula
  @Post()
  async upsertAcao(@Body() body: { userId: number; aulaId: number; like: boolean; finalizada: boolean; save: boolean }) {
    return await this.acoesAulaService.upsertAcao(body.userId, body.aulaId, body.like, body.finalizada, body.save);
  }

  // Obter ações de um usuário em uma aula específica
  @Get(':userId/:aulaId')
  async getAcao(@Param('userId') userId: number, @Param('aulaId') aulaId: number) {
    return await this.acoesAulaService.getAcaoByUserAndAula(userId, aulaId);
  }
}
