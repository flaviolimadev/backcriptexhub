import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prcing } from './entities/prcing.entity';
import { Ativo } from '../ativos/entities/ativo.entity';
import { Exage } from '../exages/exage.entity';

@Injectable()
export class PrecingsService {
  constructor(
    @InjectRepository(Prcing)
    private readonly precingRepository: Repository<Prcing>,

    @InjectRepository(Ativo)
    private readonly ativoRepository: Repository<Ativo>,

    @InjectRepository(Exage)
    private readonly exageRepository: Repository<Exage>,
  ) {}

  // 🔍 Listar todos os preços armazenados no banco de dados
  async findAll(): Promise<Prcing[]> {
    return await this.precingRepository.find({
      relations: ['ativo', 'exage'], // 🔥 Carrega os relacionamentos
    });
  }

  // 🔍 Encontrar um preço específico pelo ID
  async findById(id: number): Promise<Prcing> {
    const prcing = await this.precingRepository.findOne({
      where: { id },
      relations: ['ativo', 'exage'],
    });

    if (!prcing) {
      throw new NotFoundException(`Prcing com ID ${id} não encontrado`);
    }

    return prcing;
  }

  // ✅ Criar um novo preço para um ativo em uma exchange
  async create(
    ativoId: number,
    exageId: number,
    precing: number,
    type: number,
    volum: number,
  ): Promise<Prcing> {
    const ativo = await this.ativoRepository.findOne({ where: { id: ativoId } });
    const exage = await this.exageRepository.findOne({ where: { id: exageId } });

    if (!ativo) throw new NotFoundException(`Ativo com ID ${ativoId} não encontrado`);
    if (!exage) throw new NotFoundException(`Exchange com ID ${exageId} não encontrada`);

    const newPrcing = this.precingRepository.create({
      ativo,
      exage,
      precing,
      type,
      volum,
      status: 1,
    });

    return await this.precingRepository.save(newPrcing);
  }

  // 🔄 Atualizar um preço específico
  async update(id: number, data: Partial<Prcing>): Promise<Prcing> {
    const prcing = await this.findById(id);
    
    Object.assign(prcing, data); // 🔥 Atualiza apenas os campos passados no objeto

    return await this.precingRepository.save(prcing);
  }

  // ❌ Deletar um preço
  async delete(id: number): Promise<{ message: string }> {
    const prcing = await this.findById(id);
    
    await this.precingRepository.remove(prcing);

    return { message: `Prcing com ID ${id} deletado com sucesso.` };
  }
}
