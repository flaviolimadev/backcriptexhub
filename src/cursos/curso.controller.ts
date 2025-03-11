import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { CursoService } from './curso.service';
import { Curso } from './entities/curso.entity';

@Controller('cursos')
export class CursoController {
  constructor(private readonly cursoService: CursoService) {}

  // ✅ Criar um novo curso
  @Post()
  async createCurso(@Body() data: Partial<Curso>) {
    return await this.cursoService.createCurso(data);
  }

  // ✅ Listar todos os cursos
  @Get()
  async getAllCursos() {
    return await this.cursoService.getAllCursos();
  }

  // ✅ Buscar curso por ID
  @Get(':id')
  async getCursoById(@Param('id') id: number) {
    return await this.cursoService.getCursoById(id);
  }

  // ✅ Editar curso por ID
  @Put(':id')
  async updateCurso(@Param('id') id: number, @Body() data: Partial<Curso>) {
    return await this.cursoService.updateCurso(id, data);
  }

  // ✅ Remover um curso (marca como inativo)
  @Delete(':id')
  async deleteCurso(@Param('id') id: number) {
    return await this.cursoService.deleteCurso(id);
  }

   // 🔥 Rota que retorna a lista de todos os cursos + progresso do usuário
   @Get('progresso/:user_id')
   async getCursosComProgresso(@Param('user_id') userId: number) {
     return await this.cursoService.getCursosComProgresso(userId);
   }
}
