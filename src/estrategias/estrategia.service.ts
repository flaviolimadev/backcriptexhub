import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estrategia } from './entities/estrategia.entity';
import { User } from '../users/user.entity';

@Injectable()
export class EstrategiaService {
  constructor(
    @InjectRepository(Estrategia)
    private readonly estrategiaRepository: Repository<Estrategia>,

    @InjectRepository(User) // 🔥 Agora UserRepository está registrado corretamente
    private readonly userRepository: Repository<User>,
  ) {}

  // ✅ Criar uma nova estratégia
  async createEstrategia(userId: number, name: string, json: object) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    const estrategia = this.estrategiaRepository.create({
      user,  // 🔥 Agora a relação está correta
      name,
      json,
      status: 1,
    });

    return await this.estrategiaRepository.save(estrategia);
  }

  async updateEstrategia(id: number, name: string, json: object) {
    // 🔍 Buscar a estratégia pelo ID
    const estrategia = await this.estrategiaRepository.findOne({ where: { id } });
  
    if (!estrategia) {
      throw new Error('❌ Estratégia não encontrada.');
    }
  
    // 📝 Atualizar os campos da estratégia
    estrategia.name = name;
    estrategia.json = json;
  
    // 💾 Salvar no banco de dados
    return await this.estrategiaRepository.save(estrategia);
  }
}
