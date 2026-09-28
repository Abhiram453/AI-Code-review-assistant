import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { DatabaseService } from './database/database.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProvidersModule } from './providers/providers.module';
import { AiModule } from './ai/ai.module';
import { ProjectsModule } from './projects/projects.module';
import { FilesModule } from './files/files.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ChatModule } from './chat/chat.module';
import { BonusModule } from './bonus/bonus.module';

@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  check() {
    return {
      status: 'ok',
      product: 'CodeLens AI',
      service: 'codelens-ai-backend',
      database: this.db.getEngineInfo(),
      timestamp: new Date().toISOString(),
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProvidersModule,
    AiModule,
    ProjectsModule,
    FilesModule,
    ReviewsModule,
    ChatModule,
    BonusModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
