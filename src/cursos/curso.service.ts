import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Curso } from './entities/curso.entity';
import { Modulo } from '../modulos/entities/modulo.entity';
import { Aula } from '../aulas/entities/aula.entity';
import { Comentario } from '../comentarios/entities/comentario.entity';
import { AcoesAula } from '../acoes_aula/entities/acoes_aula.entity';

@Injectable()
export class CursoService {
  constructor(
    @InjectRepository(Curso) private readonly cursoRepository: Repository<Curso>,
    @InjectRepository(Modulo) private readonly moduloRepository: Repository<Modulo>,
    @InjectRepository(Aula) private readonly aulaRepository: Repository<Aula>,
    @InjectRepository(Comentario) private readonly comentarioRepository: Repository<Comentario>,
    @InjectRepository(AcoesAula) private readonly acoesAulaRepository: Repository<AcoesAula>,
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

  async getCursosComProgresso(userId: number) {
    // ✅ Buscar todos os cursos e incluir os módulos e aulas
    const cursos = await this.cursoRepository.find({
        relations: ['modulos', 'modulos.aulas'], // Inclui módulos e suas aulas diretamente
    });

    if (!cursos.length) {
        return [];
    }

    const cursosComDetalhes = await Promise.all(
        cursos.map(async (curso) => {
            // ✅ Contar o total de comentários do curso
            const totalComentarios = await this.comentarioRepository.count({
                where: { aula: { modulo: { curso: { id: curso.id } } } },
            });

            // ✅ Contar o total de likes no curso (likes das aulas)
            const totalLikes = await this.acoesAulaRepository.count({
                where: { aula: { modulo: { curso: { id: curso.id } } }, like: true },
            });

            // ✅ Buscar todas as aulas do curso
            const totalAulas = await this.aulaRepository.count({
                where: { modulo: { curso: { id: curso.id } } },
            });

            // ✅ Contar quantas aulas foram concluídas pelo usuário
            const aulasConcluidas = await this.acoesAulaRepository.count({
                where: { aula: { modulo: { curso: { id: curso.id } } }, user: { id: userId }, finalizada: true },
            });

            // 🔥 Calcular o progresso do usuário no curso
            const progresso = totalAulas > 0 ? ((aulasConcluidas / totalAulas) * 100).toFixed(2) : "0";

            return {
                id: curso.id,
                titulo: curso.titulo,
                descricao: curso.descricao,
                capa: curso.capa,
                status: curso.status,
                libera_em: curso.libera_em,
                garantia: curso.garantia,
                url: curso.url,
                total_comentarios: totalComentarios,
                total_likes: totalLikes,
                progresso_usuario: `${progresso}%`,
                modulos: curso.modulos.map(modulo => ({
                    id: modulo.id,
                    name: modulo.name,
                    descricao: modulo.descricao,
                    avatar: modulo.avatar,
                    status: modulo.status,
                    libera_em: modulo.libera_em,
                    garantia: modulo.garantia,
                    aulas: modulo.aulas.map(aula => ({
                        id: aula.id,
                        name: aula.name,
                        descricao: aula.descricao,
                        avatar: aula.avatar,
                        link: aula.link,
                        status: aula.status,
                        libera_em: aula.libera_em,
                        garantia: aula.garantia,
                    })),
                })),
            };
        })
    );

    return cursosComDetalhes;
  }

}
