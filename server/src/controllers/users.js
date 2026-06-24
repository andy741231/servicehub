import prisma from '../db/client.js';
import bcrypt from 'bcrypt';

export const listUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        roles: { include: { role: true } },
        permissions: true,
      }
    });
    
    const formatted = users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      name: u.name,
      isActive: u.isActive,
      roles: u.roles.map(r => r.role.name),
      permissions: u.permissions.filter(p => p.canAccess).map(p => p.appId)
    }));
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const createUser = async (req, res) => {
  try {
    const { username, email, password, name, roles = [], permissions = [] } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        username, email, name, password: hashedPassword,
      }
    });
    
    // Assign roles
    if (roles.length > 0) {
      const dbRoles = await prisma.role.findMany({ where: { name: { in: roles } }});
      await prisma.userRole.createMany({
        data: dbRoles.map(r => ({ userId: user.id, roleId: r.id }))
      });
    }

    // Assign permissions
    if (permissions.length > 0) {
      await prisma.appPermission.createMany({
        data: permissions.map(appId => ({ userId: user.id, appId, canAccess: true }))
      });
    }

    res.json({ message: 'User created' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive, roles, permissions } = req.body;
    
    await prisma.user.update({
      where: { id },
      data: { name, isActive }
    });

    if (roles) {
      await prisma.userRole.deleteMany({ where: { userId: id } });
      const dbRoles = await prisma.role.findMany({ where: { name: { in: roles } }});
      await prisma.userRole.createMany({
        data: dbRoles.map(r => ({ userId: id, roleId: r.id }))
      });
    }

    if (permissions) {
      await prisma.appPermission.deleteMany({ where: { userId: id } });
      await prisma.appPermission.createMany({
        data: permissions.map(appId => ({ userId: id, appId, canAccess: true }))
      });
    }

    res.json({ message: 'User updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.userRole.deleteMany({ where: { userId: id } });
    await prisma.appPermission.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
