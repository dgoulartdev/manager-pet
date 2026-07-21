import { PrismaClient } from '@prisma/client';
import { E2E_SCHEMA } from './test-db';

export default async function teardown(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "${E2E_SCHEMA}" CASCADE`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
