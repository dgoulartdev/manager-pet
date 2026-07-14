import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash('teste123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'teste@gerenciamentofelinos.com' },
    update: {},
    create: {
      name: 'Usuário de Teste',
      email: 'teste@gerenciamentofelinos.com',
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
      species: 'Felino',
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
