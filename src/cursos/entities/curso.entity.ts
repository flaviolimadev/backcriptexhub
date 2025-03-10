import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Modulo } from '../../modulos/entities/modulo.entity';

@Entity('cursos')
export class Curso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  titulo: string;

  @Column({ type: 'text' })
  descricao: string;

  @Column({ type: 'varchar', length: 255 })
  capa: string;

  @Column({ type: 'boolean', default: true }) // ✅ Alterado de tinyint para boolean
  status: boolean; // true = Disponível, false = Indisponível

  @Column({ type: 'timestamp', nullable: true })
  libera_em: Date;

  @Column({ type: 'integer', default: 0 }) // ✅ Alterado de tinyint para integer
  garantia: number; // Dias para liberar o curso após cadastro

  @Column({ type: 'varchar', length: 255, nullable: true })
  url: string; // URL de vídeo explicativo, pode ser nulo

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @OneToMany(() => Modulo, (modulo) => modulo.curso, { cascade: true })
  modulos: Modulo[];
}
