import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Modulo } from '../../modulos/entities/modulo.entity';

@Entity()
export class Aula {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Modulo, (modulo) => modulo.aulas, { onDelete: 'CASCADE' })
  modulo: Modulo;

  @Column()
  name: string;

  @Column({ type: 'text' })
  descricao: string;

  @Column({ nullable: true })
  avatar: string;

  @Column()
  link: string;

  @Column({ type: 'json', nullable: true })
  anexos: { titulo: string; url: string }[];

  @Column({ default: 1 })
  status: number;

  @Column({ type: 'timestamp', nullable: true })
  libera_em: Date;

  @Column({ type: 'int', default: 0 })
  garantia: number;
}
