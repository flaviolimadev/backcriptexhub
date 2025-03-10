import { EntityRepository, Repository } from 'typeorm';
import { Estrategia } from './entities/estrategia.entity';

@EntityRepository(Estrategia)
export class EstrategiaRepository extends Repository<Estrategia> {}
