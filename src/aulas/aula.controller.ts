import { Controller, Post, Put, Get, Delete, Param, Body } from '@nestjs/common';
import { AulaService } from './aula.service';

@Controller('aulas')
export class AulaController {
  constructor(private readonly aulaService: AulaService) {}

  // ✅ Criar uma nova aula
  @Post()
  async create(@Body() body: {
    moduloId: number;
    name: string;
    descricao: string;
    avatar?: string;
    link?: string;
    anexos?: { titulo: string; url: string }[];
    libera_em?: Date;
    garantia?: number;
  }) {
    return await this.aulaService.createAula(
      body.moduloId,
      body.name,
      body.descricao,
      body.avatar,
      body.link,
      body.anexos,
      body.libera_em,
      body.garantia
    );
  }

  // ✅ Editar uma aula existente
  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() body: {
      name?: string;
      descricao?: string;
      avatar?: string;
      link?: string;
      anexos?: { titulo: string; url: string }[];
      libera_em?: Date;
      garantia?: number;
    }
  ) {
    return await this.aulaService.updateAula(
      id,
      body.name,
      body.descricao,
      body.avatar,
      body.link,
      body.anexos,
      body.libera_em,
      body.garantia
    );
  }

  // ✅ Buscar todas as aulas
  @Get()
  async getAll() {
    return await this.aulaService.findAll();
  }

  // ✅ Buscar uma aula específica
  @Get(':id')
  async getOne(@Param('id') id: number) {
    return await this.aulaService.findOne(id);
  }

  // ✅ Deletar uma aula
  @Delete(':id')
  async delete(@Param('id') id: number) {
    return await this.aulaService.deleteAula(id);
  }

  // 🔥 Rota para obter detalhes da aula com base no usuário
  @Get('detalhes/:user_id/:aula_id')
  async getAulaDetalhes(
    @Param('user_id') userId: number,
    @Param('aula_id') aulaId: number
  ) {
    return await this.aulaService.getAulaDetalhes(userId, aulaId);
  }
}
