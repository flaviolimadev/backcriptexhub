import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
  } from "typeorm";
  import { Ativo } from "../../ativos/entities/ativo.entity";
  import { Exage } from "../../exages/exage.entity";
  
  @Entity("precings")
  export class Prcing {
    @PrimaryGeneratedColumn()
    id: number;
  
    @ManyToOne(() => Ativo, (ativo) => ativo.precings, { eager: true })
    ativo: Ativo;
  
    @ManyToOne(() => Exage, (exage) => exage.precings, { eager: true })
    exage: Exage;
  
    @Column({ type: "decimal", precision: 18, scale: 8 })
    precing: number;
  
    @Column({ default: 1 }) // 1 - Mercado Futuro, 2 - Mercado Spot
    type: number;
  
    @Column({ type: "decimal", precision: 18, scale: 2 })
    volum: number;
  
    @Column({ default: 1 }) // 1 - Disponível, 0 - Indisponível
    status: number;
  
    @CreateDateColumn()
    created_at: Date;
  
    @UpdateDateColumn()
    updated_at: Date;
  }
  