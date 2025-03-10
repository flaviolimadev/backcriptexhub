import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('estrategias')
export class Estrategia {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.estrategias, { onDelete: 'CASCADE' }) // 🔥 Definindo a relação correta
  user: User;

  @Column({ default: 1 }) // 🔥 Status 1 por padrão
  status: number;

  @Column({ type: 'json' })
  json: object;

  @Column()
  name: string;
}
