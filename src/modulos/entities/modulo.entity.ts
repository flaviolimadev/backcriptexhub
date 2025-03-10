import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Curso } from '../../cursos/entities/curso.entity';
import { Aula } from '../../aulas/entities/aula.entity';

@Entity('modulos')
export class Modulo {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Curso, (curso) => curso.modulos, { onDelete: 'CASCADE' })
  curso: Curso;

  @Column()
  name: string;

  @Column('text')
  descricao: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ type: 'integer', default: 1 }) // 1 = Ativo, 0 = Bloqueado
  status: number;

  @Column({ type: 'timestamp', nullable: true })
  libera_em: Date;

  @Column({ type: 'integer', default: 0 }) // Dias até a liberação
  garantia: number;

  @OneToMany(() => Aula, (aula) => aula.modulo)
  aulas: Aula[];
}
