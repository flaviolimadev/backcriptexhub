import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Exage } from "./exage.entity";

@Injectable()
export class ExagesService {
  constructor(
    @InjectRepository(Exage)
    private readonly exagesRepository: Repository<Exage>
  ) {}

  async findAll(): Promise<Exage[]> {
    return this.exagesRepository.find();
  }

  async findById(id: number): Promise<Exage | null> {
    return this.exagesRepository.findOne({ where: { id } });
  }

  async create(exageData: Partial<Exage>): Promise<Exage> {
    const exage = this.exagesRepository.create(exageData);
    return this.exagesRepository.save(exage);
  }

  async update(id: number, exageData: Partial<Exage>): Promise<Exage | null> {
    await this.exagesRepository.update(id, exageData);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.exagesRepository.delete(id);
  }
}
