import { Controller, Get, Post, Body, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';

@Controller('users') // 🔥 Esse prefixo define a rota /users
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Post()
  async create(@Body() userData: Partial<User>): Promise<User> {
    try {
      return await this.usersService.create(userData);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
