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
    const { name, email, username, password, isActive, roles, permissions } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const data = {};

    if (typeof name === 'string' && name !== existing.name) {
      data.name = name;
    }

    // Email — uniqueness checked against other users (409 on conflict).
    if (typeof email === 'string' && email !== existing.email) {
      if (!email.trim()) return res.status(400).json({ error: 'Email cannot be empty' });
      const emailTaken = await prisma.user.findFirst({
        where: { email: email.trim(), NOT: { id } },
        select: { id: true },
      });
      if (emailTaken) return res.status(409).json({ error: 'That email is already in use' });
      data.email = email.trim();
    }

    // Username — uniqueness checked against other users (409 on conflict).
    if (typeof username === 'string' && username !== existing.username) {
      if (!username.trim()) return res.status(400).json({ error: 'Username cannot be empty' });
      const usernameTaken = await prisma.user.findFirst({
        where: { username: username.trim(), NOT: { id } },
        select: { id: true },
      });
      if (usernameTaken) return res.status(409).json({ error: 'That username is already taken' });
      data.username = username.trim();
    }

    // Optional password reset — admin sets a new password without needing
    // the user's current one. Hashed before storage.
    if (typeof password === 'string' && password.length > 0) {
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      data.password = await bcrypt.hash(password, 10);
    }

    if (typeof isActive === 'boolean') {
      data.isActive = isActive;
    }

    if (Object.keys(data).length > 0) {
      await prisma.user.update({ where: { id }, data });
    }

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
    console.error('Error updating user:', error);
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
