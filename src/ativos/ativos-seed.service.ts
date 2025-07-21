import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ativo } from './entities/ativo.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AtivosSeedService implements OnModuleInit {
  private readonly logger = new Logger(AtivosSeedService.name);

  constructor(
    @InjectRepository(Ativo)
    private readonly ativosRepository: Repository<Ativo>,
  ) {}

  async onModuleInit() {
    await this.seedAtivos();
  }

  private async seedAtivos(): Promise<void> {
    try {
      this.logger.log('🌱 Iniciando seed de ativos...');

      // Caminho para o arquivo JSON
      const jsonFilePath = path.join(process.cwd(), 'ativos_formatados.json');

      // Verificar se o arquivo existe
      if (!fs.existsSync(jsonFilePath)) {
        this.logger.warn('⚠️ Arquivo ativos_formatados.json não encontrado. Pulando seed.');
        return;
      }

      // Ler e parsear o arquivo JSON
      const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
      const ativosData = JSON.parse(jsonContent);

      if (!Array.isArray(ativosData)) {
        this.logger.error('❌ Formato inválido no arquivo ativos_formatados.json');
        return;
      }

      let inseridos = 0;
      let ignorados = 0;

      // Processar cada ativo
      for (const ativoData of ativosData) {
        try {
          // Verificar se o ativo já existe
          const existingAtivo = await this.ativosRepository.findOne({
            where: { name: ativoData.name }
          });

          if (existingAtivo) {
            this.logger.debug(`⏭️ Ativo ${ativoData.name} já existe. Ignorando.`);
            ignorados++;
            continue;
          }

          // Criar novo ativo
          const novoAtivo = this.ativosRepository.create({
            name: ativoData.name,
            status: ativoData.status || 1,
            avatar: ativoData.avatar || null,
            description: ativoData.description || `Par de negociação ${ativoData.name} para arbitragem`
          });

          await this.ativosRepository.save(novoAtivo);
          this.logger.debug(`✅ Ativo ${ativoData.name} inserido com sucesso.`);
          inseridos++;

        } catch (error) {
          this.logger.error(`❌ Erro ao processar ativo ${ativoData.name}: ${error.message}`);
        }
      }

      this.logger.log(`🎉 Seed de ativos concluído! Inseridos: ${inseridos}, Ignorados: ${ignorados}`);

    } catch (error) {
      this.logger.error(`❌ Erro durante o seed de ativos: ${error.message}`);
    }
  }
}