import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { Comentario } from '../../comentarios/entities/comentario.entity';
import { User } from '../../users/user.entity';

@Entity('acoes_comentario')
export class AcoesComentario {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Comentario, (comentario) => comentario.acoes, { onDelete: 'CASCADE' })
  comentario: Comentario;

  @ManyToOne(() => User, (user) => user.acoesComentario, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'boolean', default: false })
  like: boolean;

  @Column({ type: 'boolean', default: false })
  save: boolean;
}
