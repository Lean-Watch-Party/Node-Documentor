import { Module } from '@nestjs/common';
import { DocumentationModule } from './documentation/documentation.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    DocumentationModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
