import prisma from '../db/client.js';

// Role hierarchy: super_admin > admin > editor > viewer
// super_admin satisfies any role requirement, including 'admin'.
const ROLE_HIERARCHY = ['super_admin', 'admin', 'editor', 'viewer'];

async function userHasRole(userId, roleName) {
  const requiredLevel = ROLE_HIERARCHY.indexOf(roleName);
  if (requiredLevel === -1) return false;

  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });

  return userRoles.some((ur) => {
    const userLevel = ROLE_HIERARCHY.indexOf(ur.role.name);
    return userLevel !== -1 && userLevel <= requiredLevel;
  });
}

export const requireAppAccess = (appId) => async (req, res, next) => {
  try {
    // super_admin and admin bypass per-app permission checks
    const isPrivileged = await userHasRole(req.user.id, 'admin');
    if (isPrivileged) return next();

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
    const hasRole = await userHasRole(req.user.id, roleName);

    if (!hasRole) {
      return res.status(403).json({ error: `Access denied. Requires ${roleName} role.` });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Error checking roles' });
  }
};
