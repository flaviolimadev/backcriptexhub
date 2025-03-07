import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

console.log("🔍 Verificando variáveis de ambiente...");
console.log("BITGET_API_KEY:", process.env.BITGET_API_KEY ? "OK" : "❌ NÃO DEFINIDO");
console.log("BITGET_SECRET_KEY:", process.env.BITGET_SECRET_KEY ? "OK" : "❌ NÃO DEFINIDO");
console.log("BITGET_PASSPHRASE:", process.env.BITGET_PASSPHRASE ? "OK" : "❌ NÃO DEFINIDO");

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🔥 Habilitar CORS para permitir requisições do frontend
  app.enableCors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type, Authorization",
  });

  app.setGlobalPrefix('api');

  await app.listen(3000);
}
bootstrap();
