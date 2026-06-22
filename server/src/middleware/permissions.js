import prisma from '../db/client.js';

export const requireAppAccess = (appId) => async (req, res, next) => {
  try {
    // Check if user is an admin
    const isAdmin = await prisma.userRole.findFirst({
      where: {
        userId: req.user.id,
        role: { name: 'admin' }
      }
    });

    if (isAdmin) {
      return next();
    }

    const permission = await prisma.appPermission.findUnique({
      where: { 
        userId_appId: { 
          userId: req.user.id, 
          appId 
        } 
      }
    });
    
    if (!permission?.canAccess) {
      return res.status(403).json({ error: 'Access denied to this application' });
    }
    
    next();
  } catch (error) {
    console.error('Permission check error:', error);
    res.status(500).json({ error: 'Internal server error during permission check' });
  }
};

export const requireRole = (roleName) => async (req, res, next) => {
  try {
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId: req.user.id,
        role: {
          name: roleName
        }
      }
    });

    if (!userRole) {
      return res.status(403).json({ error: `Access denied. Requires ${roleName} role.` });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Error checking roles' });
  }
};
