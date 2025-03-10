import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Modulo } from './entities/modulo.entity';
import { Curso } from '../cursos/entities/curso.entity';

@Injectable()
export class ModuloService {
  constructor(
    @InjectRepository(Modulo)
    private readonly moduloRepository: Repository<Modulo>,
    
    @InjectRepository(Curso)
    private readonly cursoRepository: Repository<Curso>,
  ) {}

  // ✅ Criar um novo módulo
  async createModulo(cursoId: number, name: string, descricao: string, avatar?: string, libera_em?: Date, garantia?: number): Promise<Modulo> {
    const curso = await this.cursoRepository.findOne({ where: { id: cursoId } });
    if (!curso) {
      throw new Error(`Curso com ID ${cursoId} não encontrado.`);
    }

    const modulo = this.moduloRepository.create({
      curso,  // 🔥 Agora corretamente referenciado
      name,
      descricao,
      avatar: avatar ?? '', // 🔥 Garante que `avatar` nunca seja null
      status: 1,
      libera_em: libera_em ?? new Date(), // 🔥 Garante que `libera_em` nunca seja null
      garantia: garantia ?? 0,
    });

    return await this.moduloRepository.save(modulo);
  }

  // ✅ Listar todos os módulos
  async findAllModulos(): Promise<Modulo[]> {
    return await this.moduloRepository.find({ relations: ['curso'] });
  }

  async findModuloById(id: number): Promise<Modulo> {
    const modulo = await this.moduloRepository.findOne({ where: { id }, relations: ['curso'] });
  
    if (!modulo) {
      throw new Error(`Módulo com ID ${id} não encontrado.`);
    }
  
    return modulo;  // 🔥 Agora garantimos que `modulo` nunca será `null`
  }
  

  // ✅ Atualizar um módulo existente
  async updateModulo(id: number, name?: string, descricao?: string, avatar?: string, status?: number, libera_em?: Date, garantia?: number): Promise<Modulo> {
    const modulo = await this.moduloRepository.findOne({ where: { id } });

    if (!modulo) {
      throw new Error(`Módulo com ID ${id} não encontrado.`);
    }

    if (name !== undefined) modulo.name = name;
    if (descricao !== undefined) modulo.descricao = descricao;
    if (avatar !== undefined) modulo.avatar = avatar ?? ''; // 🔥 Garante que `avatar` nunca seja null
    if (status !== undefined) modulo.status = status;
    if (libera_em !== undefined) modulo.libera_em = libera_em ?? new Date(); // 🔥 Garante que `libera_em` nunca seja null
    if (garantia !== undefined) modulo.garantia = garantia;

    return await this.moduloRepository.save(modulo);
  }

  // ✅ Deletar um módulo
  async deleteModulo(id: number): Promise<string> {
    const result = await this.moduloRepository.delete(id);
    if (result.affected === 0) {
      throw new Error(`Módulo com ID ${id} não encontrado.`);
    }
    return `Módulo com ID ${id} removido com sucesso.`;
  }
}
