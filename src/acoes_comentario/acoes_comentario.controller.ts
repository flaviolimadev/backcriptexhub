import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { AcoesComentarioService } from './acoes_comentario.service';

@Controller('acoes-comentario')
export class AcoesComentarioController {
  constructor(private readonly acoesComentarioService: AcoesComentarioService) {}

  // Criar ou atualizar uma ação em um comentário
  @Post()
  async upsertAcaoComentario(
    @Body() body: { userId: number; comentarioId: number; like: boolean; save: boolean }
  ) {
    return await this.acoesComentarioService.upsertAcaoComentario(body.userId, body.comentarioId, body.like, body.save);
  }

  // Buscar todas as ações de um comentário específico
  @Get(':comentarioId')
  async getAcoesByComentario(@Param('comentarioId') comentarioId: number) {
    return await this.acoesComentarioService.getAcoesByComentario(comentarioId);
  }
}
