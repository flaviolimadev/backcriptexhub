import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AtivosService } from './ativos.service';
import { Ativo } from './entities/ativo.entity';

@Controller('ativos')
export class AtivosController {
  constructor(private readonly ativosService: AtivosService) {}

  @Get()
  async findAll(): Promise<Ativo[]> {
    return await this.ativosService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: number): Promise<Ativo | null> {
    return await this.ativosService.findById(id);
  }

  @Post()
  async create(@Body() ativo: Partial<Ativo>): Promise<Ativo> {
    return await this.ativosService.create(ativo);
  }

  @Patch(':id')
  async update(@Param('id') id: number, @Body() ativo: Partial<Ativo>): Promise<Ativo> {
    return await this.ativosService.update(id, ativo);
  }

  @Delete(':id')
  async delete(@Param('id') id: number): Promise<void> {
    return await this.ativosService.delete(id);
  }
}
