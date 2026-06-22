import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });

  await prisma.role.upsert({
    where: { name: 'editor' },
    update: {},
    create: { name: 'editor' },
  });

  await prisma.role.upsert({
    where: { name: 'viewer' },
    update: {},
    create: { name: 'viewer' },
  });

  console.log('Roles seeded.');

  // Create admin user with a properly hashed password
  const hashedPassword = await bcrypt.hash('Admin@2024!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@servicehub.com' },
    update: {},
    create: {
      email: 'admin@servicehub.com',
      password: hashedPassword,
      name: 'System Admin',
    },
  });

  // Assign admin role
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  // Grant access to all apps
  for (const appId of ['web', 'forms', 'email']) {
    await prisma.appPermission.upsert({
      where: { userId_appId: { userId: adminUser.id, appId } },
      update: { canAccess: true },
      create: { userId: adminUser.id, appId, canAccess: true },
    });
  }

  console.log('Admin user seeded: admin@servicehub.com / Admin@2024!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
