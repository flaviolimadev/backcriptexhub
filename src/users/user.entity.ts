import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Estrategia } from '../estrategias/entities/estrategia.entity';
import { OneToMany } from 'typeorm';
import { AcoesComentario } from '../acoes_comentario/entities/acoes_comentario.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ unique: true })
  user: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'int', nullable: true })
  email_verify: number;

  @Column({ unique: true })
  contato: string;

  @Column({ type: 'int', nullable: true })
  contato_verify: number;

  @Column()
  password: string;

  @Column({ type: 'int', default: 1 })
  status: number;

  @Column({ type: 'int', default: 0 })
  is_admin: number;

  @Column({ type: 'int', default: 0 })
  is_acess: number;

  @Column({ type: 'timestamp', nullable: true })
  finish_acess: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Dentro da classe `User`
  @OneToMany(() => Estrategia, (estrategia) => estrategia.user)
  estrategias: Estrategia[];

  @OneToMany(() => AcoesComentario, (acao) => acao.user)
  acoesComentario: AcoesComentario[]; // 🔥 Adicionando a relação correta
}
