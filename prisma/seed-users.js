import { PrismaClient } from '@prisma/client';

// Connect to DEV database to read users
const devPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Connect to PROD database to write users
const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_PROD || process.env.DATABASE_URL
    }
  }
});

async function seedUsersFromDev() {
  console.log('Seeding users from dev database...');

  try {
    // First, ensure all roles exist in production
    const roles = await devPrisma.role.findMany();
    console.log(`Found ${roles.length} roles in dev database`);
    
    for (const role of roles) {
      await prodPrisma.role.upsert({
        where: { id: role.id },
        update: { name: role.name },
        create: {
          id: role.id,
          name: role.name,
        },
      });
      console.log(`Processed role: ${role.name}`);
    }

    // Get all users from dev database with their roles and permissions
    const users = await devPrisma.user.findMany({
      include: {
        roles: {
          include: {
            role: true
          }
        },
        permissions: true
      }
    });

    console.log(`Found ${users.length} users in dev database`);

    for (const user of users) {
      // Upsert user (create or update) in production
      const upsertedUser = await prodPrisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          password: user.password,
          isActive: user.isActive,
          refreshToken: user.refreshToken,
        },
        create: {
          id: user.id, // Keep same ID for consistency
          email: user.email,
          password: user.password,
          name: user.name,
          isActive: user.isActive,
          refreshToken: user.refreshToken,
          createdAt: user.createdAt,
        },
      });

      console.log(`Processed user: ${user.email}`);

      // Upsert user roles in production
      for (const userRole of user.roles) {
        await prodPrisma.userRole.upsert({
          where: { 
            userId_roleId: { 
              userId: upsertedUser.id, 
              roleId: userRole.roleId 
            } 
          },
          update: {},
          create: {
            userId: upsertedUser.id,
            roleId: userRole.roleId,
          },
        });
      }

      // Upsert app permissions in production
      for (const permission of user.permissions) {
        await prodPrisma.appPermission.upsert({
          where: { 
            userId_appId: { 
              userId: upsertedUser.id, 
              appId: permission.appId 
            } 
          },
          update: { canAccess: permission.canAccess },
          create: {
            userId: upsertedUser.id,
            appId: permission.appId,
            canAccess: permission.canAccess,
          },
        });
      }
    }

    console.log('✅ Successfully seeded users from dev to production');
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
}

seedUsersFromDev()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await devPrisma.$disconnect();
    await prodPrisma.$disconnect();
  });