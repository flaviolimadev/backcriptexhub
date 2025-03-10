import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Aula } from '../../aulas/entities/aula.entity';
import { User } from '../../users/user.entity';
import { AcoesComentario } from '../../acoes_comentario/entities/acoes_comentario.entity';

@Entity('comentarios')
export class Comentario {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Aula, { onDelete: 'CASCADE' })
  aula: Aula;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'text' })
  comentario: string;

  @ManyToOne(() => Comentario, { nullable: true, onDelete: 'CASCADE' })
  comentarioPai?: Comentario | null;

  @Column({ type: 'smallint', default: 1 }) // ✅ Alterado de tinyint para smallint
  status: number;

  @Column({ type: 'smallint', default: 1 }) // ✅ Alterado de tinyint para smallint
  type: number;

  @OneToMany(() => AcoesComentario, (acao) => acao.comentario)
  acoes: AcoesComentario[]; // 🔥 Adicionando a relação correta
}
