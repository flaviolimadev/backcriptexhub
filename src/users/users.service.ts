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
    const user = await this.usersRepository.findOne({ where: { email } });
    return user || undefined;
  }

  async findByUser(user: string): Promise<User | undefined> {
    const foundUser = await this.usersRepository.findOne({ where: { user } });
    return foundUser || undefined;
  }
  
  async findByContato(contato: string): Promise<User | undefined> {
    const user = await this.usersRepository.findOne({ where: { contato } });
    return user || undefined;
  }

  async create(userData: Partial<User>): Promise<User> {
    // Verificar se user, email ou contato já existem
    const existingUser = userData.user ? await this.findByUser(userData.user) : undefined;
    if (existingUser) {
      throw new BadRequestException('O nome de usuário já existe');
    }

    const existingEmail = userData.email ? await this.findByEmail(userData.email) : undefined;
    if (existingEmail) {
      throw new BadRequestException('O email já está em uso');
    }

    const existingContato = userData.contato ? await this.findByContato(userData.contato) : undefined;
    if (existingContato) {
      throw new BadRequestException('O contato já está cadastrado');
    }

    // Criptografar senha
    const password = userData.password || 'defaultpassword';
const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.usersRepository.create({
      ...userData,
      password: hashedPassword,
    });

    return this.usersRepository.save(user);
  }
}
