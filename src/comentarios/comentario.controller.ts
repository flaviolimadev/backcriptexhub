import { Controller, Post, Put, Get, Delete, Param, Body } from '@nestjs/common';
import { ComentarioService } from './comentario.service';

@Controller('comentarios')
export class ComentarioController {
  constructor(private readonly comentarioService: ComentarioService) {}

  // ✅ Criar um novo comentário
  @Post()
  async create(@Body() body: { aulaId: number; userId: number; comentario: string; type: number; comentarioId?: number }) {
    return await this.comentarioService.createComentario(body.aulaId, body.userId, body.comentario, body.type, body.comentarioId);
  }

  // ✅ Buscar comentários de uma aula
  @Get(':aulaId')
  async getComentariosByAula(@Param('aulaId') aulaId: number) {
    return await this.comentarioService.findComentariosByAula(aulaId);
  }

  // ✅ Editar um comentário
  @Put(':id')
  async update(@Param('id') id: number, @Body() body: { comentario: string }) {
    return await this.comentarioService.updateComentario(id, body.comentario);
  }

  // ✅ Deletar um comentário
  @Delete(':id')
  async delete(@Param('id') id: number) {
    return await this.comentarioService.deleteComentario(id);
  }
}
