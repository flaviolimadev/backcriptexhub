import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByUser(user: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { user } });
  }

  async findByContato(contato: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { contato } });
  }

  async create(userData: Partial<User>): Promise<User> {
    // Verificar se user, email ou contato já existem
    const existingUser = await this.findByUser(userData.user);
    if (existingUser) {
      throw new BadRequestException('O nome de usuário já existe');
    }

    const existingEmail = await this.findByEmail(userData.email);
    if (existingEmail) {
      throw new BadRequestException('O email já está em uso');
    }

    const existingContato = await this.findByContato(userData.contato);
    if (existingContato) {
      throw new BadRequestException('O contato já está cadastrado');
    }

    // Criptografar senha
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = this.usersRepository.create({
      ...userData,
      password: hashedPassword,
    });

    return this.usersRepository.save(user);
  }
}
