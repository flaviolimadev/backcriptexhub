import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Curso } from './entities/curso.entity';

@Injectable()
export class CursoService {
  constructor(
    @InjectRepository(Curso)
    private readonly cursoRepository: Repository<Curso>,
  ) {}

  // ✅ Criar um novo curso
  async createCurso(data: Partial<Curso>): Promise<Curso> {
    const novoCurso = this.cursoRepository.create(data);
    return await this.cursoRepository.save(novoCurso);
  }

  // ✅ Listar todos os cursos
  async getAllCursos(): Promise<Curso[]> {
    return await this.cursoRepository.find();
  }

  // ✅ Buscar um curso por ID
  async getCursoById(id: number): Promise<Curso> {
    const curso = await this.cursoRepository.findOne({ where: { id } });
    if (!curso) throw new NotFoundException('Curso não encontrado!');
    return curso;
  }

  // ✅ Atualizar um curso existente
  async updateCurso(id: number, data: Partial<Curso>): Promise<Curso> {
    const curso = await this.getCursoById(id);
    Object.assign(curso, data);
    return await this.cursoRepository.save(curso);
  }

  // ✅ Remover um curso (marcar como inativo)
  async deleteCurso(id: number): Promise<{ message: string }> {
    const curso = await this.getCursoById(id);
    curso.status = false; // Define como inativo
    await this.cursoRepository.save(curso);
    return { message: 'Curso marcado como inativo com sucesso!' };
  }
}
