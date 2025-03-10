import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController], // 🔥 Certifique-se de que o controlador está registrado aqui
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
