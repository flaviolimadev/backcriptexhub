import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aula } from './entities/aula.entity';
import { Modulo } from '../modulos/entities/modulo.entity';
import { Comentario } from '../comentarios/entities/comentario.entity';
import { AcoesAula } from '../acoes_aula/entities/acoes_aula.entity';
import { Curso } from '../cursos/entities/curso.entity';
import { AcoesComentario } from '../acoes_comentario/entities/acoes_comentario.entity'; // ✅ Adicionando a entidade correta

@Injectable()
export class AulaService {
  constructor(
    @InjectRepository(Aula)
    private readonly aulaRepository: Repository<Aula>,
    
    @InjectRepository(Comentario)
    private readonly comentarioRepository: Repository<Comentario>,
    
    @InjectRepository(AcoesAula)
    private readonly acoesAulaRepository: Repository<AcoesAula>,

    @InjectRepository(Modulo)
    private readonly moduloRepository: Repository<Modulo>,

    @InjectRepository(AcoesComentario) // ✅ Agora injetamos corretamente
    private readonly acoesComentarioRepository: Repository<AcoesComentario>,

    @InjectRepository(Curso)
    private readonly cursoRepository: Repository<Curso> // ✅ Correção
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

  async getAulaDetalhes(userId: number, aulaId: number) {
    console.log(`🔍 Buscando detalhes da aula ID: ${aulaId} para o usuário ID: ${userId}`);

    // 🔍 Buscar a aula com seus relacionamentos
    const aula = await this.aulaRepository.findOne({
        where: { id: aulaId },
        relations: ['modulo', 'modulo.curso'],
    });

    if (!aula) {
        console.error(`❌ Aula com ID ${aulaId} não encontrada.`);
        throw new Error('Erro ao buscar detalhes da aula: Aula não encontrada.');
    }

    // 🔍 Buscar comentários da aula
    const comentarios = await this.comentarioRepository.find({
        where: { aula: { id: aulaId } },
        relations: ['user'],
    });

    // 🔍 Buscar ações (likes/saves) de todos os comentários da aula
    const acoesComentarios = await this.acoesComentarioRepository.find({
        where: { comentario: { aula: { id: aulaId } } },
        relations: ['comentario', 'user'],
    });

    // 🔍 Buscar total de curtidas na aula
    const totalCurtidas = await this.acoesAulaRepository.count({
        where: { aula: { id: aulaId }, like: true },
    });

    // 🔍 Buscar ações do usuário na aula
    const acoesUsuario = await this.acoesAulaRepository.findOne({
        where: { aula: { id: aulaId }, user: { id: userId } },
    });

    // 🔍 Buscar módulos do curso com todas as aulas de cada módulo
    const modulos = await this.moduloRepository.find({
        where: { curso: { id: aula.modulo.curso.id } },
        relations: ['aulas'],
    });

    // 🔍 Contar total de aulas do curso
    const totalAulas = await this.aulaRepository.count({
        where: { modulo: { curso: { id: aula.modulo.curso.id } } },
    });

    // 🔍 Contar aulas concluídas pelo usuário
    const aulasConcluidas = await this.acoesAulaRepository.count({
        where: { aula: { modulo: { curso: { id: aula.modulo.curso.id } } }, user: { id: userId }, finalizada: true },
    });

    // 🔥 Calcular o percentual de conclusão do curso
    const progressoCurso = totalAulas > 0 ? ((aulasConcluidas / totalAulas) * 100).toFixed(2) : "0";

    console.log(`✅ Aula encontrada:`, aula);

    return {
        aula,
        comentarios: comentarios.map((comentario) => {
            const acoes = acoesComentarios.filter(acao => acao.comentario.id === comentario.id);

            return {
                id: comentario.id,
                texto: comentario.comentario,
                usuario: comentario.user ? comentario.user.first_name : 'Usuário desconhecido',
                acoes: acoes.map((acao) => ({
                    userId: acao.user.id,
                    like: acao.like,
                    save: acao.save,
                })),
            };
        }),
        totalCurtidas,
        acoesUsuario: acoesUsuario || {
            like: false,
            finalizada: false,
            save: false,
        },
        curso: aula.modulo.curso,
        modulos: await Promise.all(
            modulos.map(async (modulo) => {
                // 🔍 Buscar ações do usuário para cada aula do módulo
                const aulas = await Promise.all(
                    modulo.aulas.map(async (aula) => {
                        const acaoAula = await this.acoesAulaRepository.findOne({
                            where: { aula: { id: aula.id }, user: { id: userId } },
                        });

                        return {
                            id: aula.id,
                            name: aula.name,
                            descricao: aula.descricao,
                            link: aula.link,
                            avatar: aula.avatar,
                            status: aula.status,
                            libera_em: aula.libera_em,
                            garantia: aula.garantia,
                            finalizada: acaoAula ? acaoAula.finalizada : false, // 🔥 Indica se o usuário concluiu a aula
                            like: acaoAula ? acaoAula.like : false, // 🔥 Indica se o usuário curtiu a aula
                            save: acaoAula ? acaoAula.save : false, // 🔥 Indica se o usuário salvou a aula
                        };
                    })
                );

                return {
                    id: modulo.id,
                    name: modulo.name,
                    descricao: modulo.descricao,
                    avatar: modulo.avatar,
                    status: modulo.status,
                    libera_em: modulo.libera_em,
                    garantia: modulo.garantia,
                    aulas,
                };
            })
        ),
        resumoProgresso: {
            totalAulas,
            aulasConcluidas,
            progressoCurso: `${progressoCurso}%`,
        },
    };
  }



}
