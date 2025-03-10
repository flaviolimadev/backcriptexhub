import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aula } from './entities/aula.entity';
import { Modulo } from '../modulos/entities/modulo.entity';

@Injectable()
export class AulaService {
  constructor(
    @InjectRepository(Aula)
    private readonly aulaRepository: Repository<Aula>,

    @InjectRepository(Modulo)
    private readonly moduloRepository: Repository<Modulo>,
  ) {}

  // ✅ Criar uma nova aula
  async createAula(
    moduloId: number,
    name: string,
    descricao: string,
    avatar?: string,
    link?: string,
    anexos?: { titulo: string; url: string }[],
    libera_em?: Date,
    garantia?: number
  ): Promise<Aula> {
    const modulo = await this.moduloRepository.findOne({ where: { id: moduloId } });

    if (!modulo) {
      throw new NotFoundException('Módulo não encontrado.');
    }

    const novaAula = this.aulaRepository.create({
      modulo,
      name,
      descricao,
      avatar: avatar ?? '',
      link: link ?? '',
      anexos: anexos ?? [],
      libera_em: libera_em ?? undefined,
      garantia: garantia ?? 0,
      status: 1,
    });

    return await this.aulaRepository.save(novaAula);
  }

  // ✅ Atualizar uma aula existente
  async updateAula(
    id: number,
    name?: string,
    descricao?: string,
    avatar?: string,
    link?: string,
    anexos?: { titulo: string; url: string }[],
    libera_em?: Date,
    garantia?: number
  ): Promise<Aula> {
    const aula = await this.aulaRepository.findOne({ where: { id }, relations: ['modulo'] });

    if (!aula) {
      throw new NotFoundException('Aula não encontrada.');
    }

    if (name !== undefined) aula.name = name;
    if (descricao !== undefined) aula.descricao = descricao;
    if (avatar !== undefined) aula.avatar = avatar;
    if (link !== undefined) aula.link = link;
    if (anexos !== undefined) aula.anexos = anexos;
    if (libera_em !== undefined) aula.libera_em = libera_em;
    if (garantia !== undefined) aula.garantia = garantia;

    return await this.aulaRepository.save(aula);
  }

  // ✅ Buscar todas as aulas
  async findAll(): Promise<Aula[]> {
    return await this.aulaRepository.find({ relations: ['modulo'] });
  }

  // ✅ Buscar uma aula pelo ID
  async findOne(id: number): Promise<Aula> {
    const aula = await this.aulaRepository.findOne({ where: { id }, relations: ['modulo'] });

    if (!aula) {
      throw new NotFoundException('Aula não encontrada.');
    }

    return aula;
  }

  // ✅ Deletar uma aula
  async deleteAula(id: number): Promise<void> {
    const aula = await this.aulaRepository.findOne({ where: { id } });

    if (!aula) {
      throw new NotFoundException('Aula não encontrada.');
    }

    await this.aulaRepository.remove(aula);
  }
}
