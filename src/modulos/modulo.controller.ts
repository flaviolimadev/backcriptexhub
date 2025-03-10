import { Controller, Post, Get, Put, Delete, Body, Param } from '@nestjs/common';
import { ModuloService } from './modulo.service';

@Controller('modulos')
export class ModuloController {
  constructor(private readonly moduloService: ModuloService) {}

  // ✅ Criar um novo módulo
  @Post()
  async createModulo(@Body() body: { cursoId: number; name: string; descricao: string; avatar?: string; libera_em?: Date; garantia?: number }) {
    return await this.moduloService.createModulo(
      body.cursoId,
      body.name,
      body.descricao,
      body.avatar ?? undefined,  // 🔥 Corrigido para evitar erro de `null`
      body.libera_em,
      body.garantia
    );
  }

  // ✅ Listar todos os módulos
  @Get()
  async findAllModulos() {
    return await this.moduloService.findAllModulos();
  }

  // ✅ Buscar módulo por ID
  @Get(':id')
  async findModuloById(@Param('id') id: number) {
    return await this.moduloService.findModuloById(id);
  }

  // ✅ Atualizar módulo
  @Put(':id')
  async updateModulo(
    @Param('id') id: number,
    @Body() body: { name?: string; descricao?: string; avatar?: string; status?: number; libera_em?: Date; garantia?: number }
  ) {
    return await this.moduloService.updateModulo(
      id,
      body.name,
      body.descricao,
      body.avatar ?? undefined,  // 🔥 Corrigido para evitar erro de `null`
      body.status,
      body.libera_em,
      body.garantia
    );
  }

  // ✅ Deletar módulo
  @Delete(':id')
  async deleteModulo(@Param('id') id: number) {
    return await this.moduloService.deleteModulo(id);
  }
}
