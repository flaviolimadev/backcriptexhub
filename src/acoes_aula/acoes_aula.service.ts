import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcoesAula } from './entities/acoes_aula.entity';
import { Aula } from '../aulas/entities/aula.entity';
import { User } from '../users/user.entity';

@Injectable()
export class AcoesAulaService {
  constructor(
    @InjectRepository(AcoesAula)
    private readonly acoesAulaRepository: Repository<AcoesAula>,
  ) {}

  // Criar ou atualizar a ação de um usuário em uma aula
  async upsertAcao(
    userId: number,
    aulaId: number,
    like: boolean,
    finalizada: boolean,
    save: boolean,
  ): Promise<AcoesAula> {
    let acao = await this.acoesAulaRepository.findOne({
      where: { aula: { id: aulaId }, user: { id: userId } },
    });

    if (!acao) {
      acao = this.acoesAulaRepository.create({
        aula: { id: aulaId } as Aula,
        user: { id: userId } as User,
        like,
        finalizada,
        save,
      });
    } else {
      acao.like = like;
      acao.finalizada = finalizada;
      acao.save = save;
    }

    return await this.acoesAulaRepository.save(acao);
  }

  // Obter as ações de um usuário em uma aula específica
  async getAcaoByUserAndAula(userId: number, aulaId: number): Promise<AcoesAula | null> {
    return await this.acoesAulaRepository.findOne({
      where: { aula: { id: aulaId }, user: { id: userId } },
    });
  }
}
