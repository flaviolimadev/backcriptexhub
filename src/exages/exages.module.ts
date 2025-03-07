import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Exage } from "./exage.entity";
import { ExagesService } from "./exages.service";
import { ExagesController } from "./exages.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Exage])],
  controllers: [ExagesController],
  providers: [ExagesService],
  exports: [ExagesService],
})
export class ExagesModule {}
