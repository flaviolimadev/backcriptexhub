import { Controller, Get, Post, Put, Delete, Param, Body } from "@nestjs/common";
import { ExagesService } from "./exages.service";
import { Exage } from "./exage.entity";

@Controller("/exages")
export class ExagesController {
  constructor(private readonly exagesService: ExagesService) {}

  @Get()
  async getAll(): Promise<Exage[]> {
    return this.exagesService.findAll();
  }

  @Get(":id")
  async getById(@Param("id") id: number): Promise<Exage | null> {
    return this.exagesService.findById(id);
  }

  @Post()
  async create(@Body() exageData: Partial<Exage>): Promise<Exage> {
    return this.exagesService.create(exageData);
  }

  @Put(":id")
  async update(@Param("id") id: number, @Body() exageData: Partial<Exage>): Promise<Exage | null> {
    return this.exagesService.update(id, exageData);
  }

  @Delete(":id")
  async delete(@Param("id") id: number): Promise<void> {
    return this.exagesService.delete(id);
  }
}
