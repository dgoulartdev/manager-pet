import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TutorsModule } from './modules/tutors/tutors.module';
import { LocationsModule } from './modules/locations/locations.module';
import { PatientsModule } from './modules/patients/patients.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { VaccinesModule } from './modules/vaccines/vaccines.module';
import { TokenCleanupModule } from './modules/token-cleanup/token-cleanup.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    // Tarefas agendadas (hoje, só a limpeza diária de tokens).
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    TutorsModule,
    LocationsModule,
    PatientsModule,
    AppointmentsModule,
    VaccinesModule,
    TokenCleanupModule,
  ],
})
export class AppModule {}
