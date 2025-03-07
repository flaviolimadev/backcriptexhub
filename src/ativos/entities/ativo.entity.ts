import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany  } from 'typeorm';
import { Prcing } from "../../precing/entities/prcing.entity";

@Entity('ativos')
export class Ativo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'int', default: 1 })
  status: number; // 1 = Disponível, 0 = Indisponível para análise

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar: string; // Caminho da imagem do ativo (opcional)

  @Column({ type: 'text', nullable: true })
  description: string; // Informações detalhadas sobre o ativo

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

   // 🔥 Adicionando relação OneToMany com Prcing
   @OneToMany(() => Prcing, (prcing) => prcing.ativo)
   precings: Prcing[];

}
