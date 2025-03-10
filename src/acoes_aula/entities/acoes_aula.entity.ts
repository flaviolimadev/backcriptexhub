import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Aula } from '../../aulas/entities/aula.entity';
import { User } from '../../users/user.entity';

@Entity('acoes_aula')
export class AcoesAula {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Aula, { onDelete: 'CASCADE' })
  aula: Aula;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'boolean', default: false })
  like: boolean;

  @Column({ type: 'boolean', default: false })
  finalizada: boolean;

  @Column({ type: 'boolean', default: false })
  save: boolean;
}
