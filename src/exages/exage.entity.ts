import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany  } from "typeorm";
import { Prcing } from "../precing/entities/prcing.entity";

@Entity("exages")
export class Exage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: 0 })
  nota: number;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "json", nullable: true })
  diferenciais: Record<string, any>;

  @Column({ nullable: true })
  referal: string;

  @Column({ nullable: true })
  tutorial: string;

  @Column({ default: 1 })
  status: number;

  @Column({ default: 1 })
  API: number;

  @Column({ default: 0 })
  ranking: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // 🔥 Adicionando relação OneToMany com Prcing
  @OneToMany(() => Prcing, (prcing) => prcing.exage)
  precings: Prcing[];
}
