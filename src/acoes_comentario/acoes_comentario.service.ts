import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcoesComentario } from './entities/acoes_comentario.entity';
import { Comentario } from '../comentarios/entities/comentario.entity';
import { User } from '../users/user.entity';

@Injectable()
export class AcoesComentarioService {
  constructor(
    @InjectRepository(AcoesComentario)
    private readonly acoesComentarioRepository: Repository<AcoesComentario>,
  ) {}

  // Criar ou atualizar uma ação em um comentário
  async upsertAcaoComentario(userId: number, comentarioId: number, like: boolean, save: boolean): Promise<AcoesComentario> {
    const comentario = await this.acoesComentarioRepository.manager.findOne(Comentario, { where: { id: comentarioId } });
    if (!comentario) {
      throw new Error(`Comentário com ID ${comentarioId} não encontrado.`);
    }

    const user = await this.acoesComentarioRepository.manager.findOne(User, { where: { id: userId } });
    if (!user) {
      throw new Error(`Usuário com ID ${userId} não encontrado.`);
    }

    let acao = await this.acoesComentarioRepository.findOne({
      where: { comentario: { id: comentarioId }, user: { id: userId } },
    });

    if (!acao) {
      acao = this.acoesComentarioRepository.create({
        comentario,
        user,
        like,
        save,
      });
    } else {
      acao.like = like;
      acao.save = save;
    }

    return await this.acoesComentarioRepository.save(acao);
  }

  // Buscar todas as ações de um comentário
  async getAcoesByComentario(comentarioId: number): Promise<AcoesComentario[]> {
    return await this.acoesComentarioRepository.find({
      where: { comentario: { id: comentarioId } },
      relations: ['user'],
    });
  }
}
