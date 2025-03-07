import { Test, TestingModule } from '@nestjs/testing';
import { ArbitrageService } from './arbitrage.service';

describe('ArbitrageService', () => {
  let service: ArbitrageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArbitrageService],
    }).compile();

    service = module.get<ArbitrageService>(ArbitrageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
