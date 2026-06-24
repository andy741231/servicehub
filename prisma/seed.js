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
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
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

  console.log('Admin user seeded: admin / Admin@2024!');

  // Create test user with simple credentials
  const testHashedPassword = await bcrypt.hash('123', 10);

  const testUser = await prisma.user.upsert({
    where: { username: 'testuser' },
    update: {},
    create: {
      username: 'testuser',
      email: 'user@test.com',
      password: testHashedPassword,
      name: 'user',
    },
  });

  // Assign viewer role to test user
  const viewerRole = await prisma.role.findUnique({ where: { name: 'viewer' } });
  if (viewerRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: testUser.id, roleId: viewerRole.id } },
      update: {},
      create: { userId: testUser.id, roleId: viewerRole.id },
    });
  }

  // Grant access to all apps for testing
  for (const appId of ['web', 'forms', 'email']) {
    await prisma.appPermission.upsert({
      where: { userId_appId: { userId: testUser.id, appId } },
      update: { canAccess: true },
      create: { userId: testUser.id, appId, canAccess: true },
    });
  }

  console.log('Test user seeded: testuser / 123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
