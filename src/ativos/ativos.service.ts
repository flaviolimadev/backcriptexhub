import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ativo } from './entities/ativo.entity';

@Injectable()
export class AtivosService {
  constructor(
    @InjectRepository(Ativo)
    private readonly ativosRepository: Repository<Ativo>,
  ) {}

  async findAll(): Promise<Ativo[]> {
    return await this.ativosRepository.find();
  }

  async findById(id: number): Promise<Ativo | null> {
    return await this.ativosRepository.findOne({ where: { id } });
  }

  async create(ativo: Partial<Ativo>): Promise<Ativo> {
    const novoAtivo = this.ativosRepository.create(ativo);
    return await this.ativosRepository.save(novoAtivo);
  }

  async update(id: number, ativo: Partial<Ativo>): Promise<Ativo> {
    await this.ativosRepository.update(id, ativo);
    const updatedAtivo = await this.findById(id);
    if (!updatedAtivo) {
      throw new Error(`Ativo com ID ${id} não encontrado.`);
    }
    return updatedAtivo;
  }

  async delete(id: number): Promise<void> {
    await this.ativosRepository.delete(id);
  }
}
