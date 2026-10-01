import { Module } from '@nestjs/common';
import { CronSecretGuard } from './cron-secret.guard';
import { TokenCleanupController } from './token-cleanup.controller';
import { TokenCleanupService } from './token-cleanup.service';

@Module({
  controllers: [TokenCleanupController],
  providers: [TokenCleanupService, CronSecretGuard],
})
export class TokenCleanupModule {}
