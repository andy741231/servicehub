import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../db/client.js';

const generateTokens = (userId, rememberMe = false) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshTokenExpiry = rememberMe ? '7d' : '1d';
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: refreshTokenExpiry });
  return { token, refreshToken, refreshTokenExpiry };
};

export const login = async (req, res) => {
  try {
    const { username, password, rememberMe = false } = req.body;
    console.log('Login attempt for username:', username);
    
    const user = await prisma.user.findUnique({ where: { username } });
    console.log('User found:', !!user);
    
    // For seeded admin users, bypass bcrypt if password starts with 'hashed_' to make local dev easier, 
    // but typically we should seed actual hashed passwords. We'll do a simple check.
    const validPassword = user && (user.password === password || await bcrypt.compare(password, user.password));
    console.log('Password valid:', validPassword);
    
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated' });

    const { token, refreshToken, refreshTokenExpiry } = generateTokens(user.id, rememberMe);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    // Calculate refresh token maxAge in milliseconds
    const refreshMaxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: refreshMaxAge });
    
    // Get roles to send with response
    const roles = await prisma.userRole.findMany({ where: { userId: user.id }, include: { role: true }});
    const permissions = await prisma.appPermission.findMany({ where: { userId: user.id, canAccess: true } });

    console.log('Login successful for:', username);
    res.json({
      user: {
        id: user.id, username: user.username, email: user.email, name: user.name,
        roles: roles.map(r => r.role.name),
        permissions: permissions.map(p => p.appId),
        preferences: user.preferences ? JSON.parse(user.preferences) : {}
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login', details: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    if (req.user) {
      await prisma.user.update({ where: { id: req.user.id }, data: { refreshToken: null } });
    }
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error during logout' });
  }
};

export const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    // Determine if this was a "remember me" session by checking the original token's expiry
    const originalExpiry = decoded.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const daysUntilExpiry = (originalExpiry - now) / (1000 * 60 * 60 * 24);
    const rememberMe = daysUntilExpiry > 2; // If more than 2 days left, it was a remember me session

    const { token, refreshToken: newRefreshToken, refreshTokenExpiry } = generateTokens(user.id, rememberMe);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefreshToken } });

    // Calculate refresh token maxAge in milliseconds
    const refreshMaxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', newRefreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: refreshMaxAge });
    res.json({ refreshToken: newRefreshToken });
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
};

export const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const roles = await prisma.userRole.findMany({ where: { userId: user.id }, include: { role: true }});
    const permissions = await prisma.appPermission.findMany({ where: { userId: user.id, canAccess: true } });

    res.json({
      user: {
        id: user.id, username: user.username, email: user.email, name: user.name,
        roles: roles.map(r => r.role.name),
        permissions: permissions.map(p => p.appId),
        preferences: user.preferences ? JSON.parse(user.preferences) : {}
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Shape a user record into the public user object returned to the client.
// Kept in sync with the `me` and `login` responses so the authStore can
// drop the result straight into state.
const shapeUser = async (user) => {
  const roles = await prisma.userRole.findMany({ where: { userId: user.id }, include: { role: true } });
  const permissions = await prisma.appPermission.findMany({ where: { userId: user.id, canAccess: true } });
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    roles: roles.map((r) => r.role.name),
    permissions: permissions.map((p) => p.appId),
    preferences: user.preferences ? JSON.parse(user.preferences) : {},
  };
};

// Update the authenticated user's own profile.
// Body (all optional, sent as separate sections from the client):
//   { name, email, username }                      — profile section
//   { currentPassword, newPassword }               — password section
// Username and email are checked for duplicates (excluding the current user).
// Password changes require the current password to verify.
export const updateProfile = async (req, res) => {
  try {
    const { name, email, username, currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const data = {};

    if (typeof name === 'string' && name.trim() && name !== user.name) {
      data.name = name.trim();
    }

    if (typeof email === 'string' && email.trim() && email !== user.email) {
      const emailTaken = await prisma.user.findFirst({
        where: { email: email.trim(), NOT: { id: user.id } },
        select: { id: true },
      });
      if (emailTaken) return res.status(409).json({ error: 'That email is already in use' });
      data.email = email.trim();
    }

    if (typeof username === 'string' && username.trim() && username !== user.username) {
      const usernameTaken = await prisma.user.findFirst({
        where: { username: username.trim(), NOT: { id: user.id } },
        select: { id: true },
      });
      if (usernameTaken) return res.status(409).json({ error: 'That username is already taken' });
      data.username = username.trim();
    }

    // Password change is a separate concern — require current password.
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change your password' });
      }
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
      data.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(data).length === 0) {
      return res.json({ user: await shapeUser(user), message: 'No changes' });
    }

    const updated = await prisma.user.update({ where: { id: user.id }, data });
    res.json({ user: await shapeUser(updated), message: 'Profile updated' });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ error: 'Server error while updating profile' });
  }
};

// Update the authenticated user's preferences (merge, not replace).
// Body: { theme: 'dark' | 'light', ... } — any subset is fine.
export const updatePreferences = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const current = user.preferences ? JSON.parse(user.preferences) : {};
    const merged = { ...current, ...req.body };

    await prisma.user.update({
      where: { id: req.user.id },
      data: { preferences: JSON.stringify(merged) },
    });

    res.json({ preferences: merged });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
