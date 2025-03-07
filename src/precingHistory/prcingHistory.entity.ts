import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Ativo } from '../ativos/entities/ativo.entity';
import { Exage } from '../exages/exage.entity';

@Entity('prcing_historico')
export class PrcingHistory {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Ativo, (ativo) => ativo.id)
    ativo: Ativo;

    @ManyToOne(() => Exage, (exage) => exage.id)
    exage: Exage;

    @Column({ type: 'decimal', precision: 18, scale: 8 })
    precing: number;

    @CreateDateColumn()
    timestamp: Date;
}
