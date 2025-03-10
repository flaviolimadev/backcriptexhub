import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estrategia } from './entities/estrategia.entity';
import { EstrategiaService } from './estrategia.service';
import { EstrategiaController } from './estrategia.controller';
import { User } from '../users/user.entity'; // 🔥 Importa a entidade User
import { UsersModule } from '../users/users.module'; // 🔥 Importa o módulo de usuários corretamente

@Module({
  imports: [
    TypeOrmModule.forFeature([Estrategia, User]), // 🔥 Inclui User aqui também
    UsersModule, // 🔥 Importa o módulo User para acesso ao UserRepository
  ],
  controllers: [EstrategiaController],
  providers: [EstrategiaService],
})
export class EstrategiaModule {}
