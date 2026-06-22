import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });

  const editorRole = await prisma.role.upsert({
    where: { name: 'editor' },
    update: {},
    create: { name: 'editor' },
  });

  const viewerRole = await prisma.role.upsert({
    where: { name: 'viewer' },
    update: {},
    create: { name: 'viewer' },
  });

  console.log('Roles seeded.');

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: 'hashed_password_placeholder', // To be replaced when Auth is implemented
      name: 'System Admin',
    },
  });

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  // Grant admin user access to all apps
  const apps = ['web', 'forms', 'email'];
  for (const appId of apps) {
    await prisma.appPermission.upsert({
      where: {
        userId_appId: {
          userId: adminUser.id,
          appId,
        },
      },
      update: { canAccess: true },
      create: {
        userId: adminUser.id,
        appId,
        canAccess: true,
      },
    });
  }

  console.log('Admin user and permissions seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
