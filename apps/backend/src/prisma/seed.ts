import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // O seed cria uma conta com senha conhecida: só pode rodar no banco local.
  const host = new URL(process.env.DATABASE_URL ?? '').hostname;
  if (!['localhost', '127.0.0.1'].includes(host)) {
    throw new Error(`Seed recusado: o banco (${host}) não é o local.`);
  }

  const passwordHash = await hash('teste123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'teste@meupaciente.com' },
    update: {},
    create: {
      name: 'Usuário de Teste',
      email: 'teste@meupaciente.com',
      password: passwordHash,
    },
  });

  const tutor = await prisma.tutor.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      user_id: user.id,
      name: 'Tutor de Teste',
      phone: '11999999999',
      email: 'tutor@example.com',
    },
  });

  await prisma.patient.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      user_id: user.id,
      tutor_id: tutor.id,
      name: 'Miau de Teste',
      species: 'Gato',
      breed: 'SRD',
    },
  });

  console.log('Seed concluído:', { user: user.email });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
