import { Test, TestingModule } from '@nestjs/testing';
import { ArbitrageController } from './arbitrage.controller';

describe('ArbitrageController', () => {
  let controller: ArbitrageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArbitrageController],
    }).compile();

    controller = module.get<ArbitrageController>(ArbitrageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
