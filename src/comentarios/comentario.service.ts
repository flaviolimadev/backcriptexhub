import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comentario } from './entities/comentario.entity';
import { Aula } from '../aulas/entities/aula.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ComentarioService {
  constructor(
    @InjectRepository(Comentario)
    private readonly comentarioRepository: Repository<Comentario>,

    @InjectRepository(Aula)
    private readonly aulaRepository: Repository<Aula>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ✅ Criar um novo comentário
  async createComentario(
    aulaId: number,
    userId: number,
    comentario: string,
    type: number = 1,
    comentarioId?: number
  ): Promise<Comentario> {
    const aula = await this.aulaRepository.findOne({ where: { id: aulaId } });
    if (!aula) throw new NotFoundException('Aula não encontrada.');

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    let comentarioPai: Comentario | null = null;
    if (comentarioId) {
      comentarioPai = await this.comentarioRepository.findOne({ where: { id: comentarioId } });
      if (!comentarioPai) throw new NotFoundException('Comentário pai não encontrado.');
    }

    const novoComentario = this.comentarioRepository.create({
      aula,
      user,
      comentario,
      comentarioPai, // Agora corretamente atribuído como objeto ou `null`
      status: 1,
      type
    });

    return await this.comentarioRepository.save(novoComentario);
  }

  // ✅ Buscar comentários de uma aula
  async findComentariosByAula(aulaId: number): Promise<Comentario[]> {
    return await this.comentarioRepository.find({
      where: { aula: { id: aulaId }, status: 1 },
      relations: ['user', 'comentarioPai'],
      order: { id: 'ASC' },
    });
  }

  // ✅ Editar um comentário
  async updateComentario(id: number, comentario: string): Promise<Comentario> {
    const comentarioExistente = await this.comentarioRepository.findOne({ where: { id } });
    if (!comentarioExistente) throw new NotFoundException('Comentário não encontrado.');

    comentarioExistente.comentario = comentario;
    return await this.comentarioRepository.save(comentarioExistente);
  }

  // ✅ Deletar um comentário (muda status para 0)
  async deleteComentario(id: number): Promise<void> {
    const comentario = await this.comentarioRepository.findOne({ where: { id } });
    if (!comentario) throw new NotFoundException('Comentário não encontrado.');

    comentario.status = 0;
    await this.comentarioRepository.save(comentario);
  }
}
