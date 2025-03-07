import { Controller, Get, Param, Post, Body, Put, Delete } from '@nestjs/common';
import { PrecingsService } from './precings.service';
import { Prcing } from './entities/prcing.entity';

@Controller('api/precings')
export class PrecingsController {
  constructor(private readonly precingsService: PrecingsService) {}

  // 🔍 Listar todos os preços
  @Get()
  async getAll(): Promise<Prcing[]> {
    return this.precingsService.findAll();
  }

  // 🔍 Buscar preço por ID
  @Get(':id')
  async getById(@Param('id') id: number): Promise<Prcing> {
    return this.precingsService.findById(id);
  }

  // ✅ Criar um novo preço
  @Post()
  async create(@Body() prcingData: { ativoId: number; exageId: number; precing: number; type: number; volum: number }): Promise<Prcing> {
    return this.precingsService.create(
      prcingData.ativoId,
      prcingData.exageId,
      prcingData.precing,
      prcingData.type,
      prcingData.volum,
    );
  }

  // 🔄 Atualizar preço
  @Put(':id')
  async update(@Param('id') id: number, @Body() data: Partial<Prcing>): Promise<Prcing> {
    return this.precingsService.update(id, data);
  }

  // ❌ Deletar preço
  @Delete(':id')
  async delete(@Param('id') id: number): Promise<{ message: string }> {
    return this.precingsService.delete(id);
  }
}
