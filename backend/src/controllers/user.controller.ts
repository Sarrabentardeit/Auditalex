import { Response, NextFunction } from 'express';
import { User } from '../models/User.model';
import { hashPassword } from '../utils/password';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export async function getAllUsers(
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('-passwordHash');

    res.json({
      users: users.map((user) => ({
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    next(createError('Failed to fetch users', 500));
  }
}

export async function getUserById(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-passwordHash');

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    next(createError('Failed to fetch user', 500));
  }
}

export async function createUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, name, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      name,
      passwordHash,
      role,
      isActive: true,
    });

    logger.info('User created:', { email: user.email, role: user.role });

    res.status(201).json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    });
  } catch (error) {
    logger.error('Create user error:', error);
    next(createError('Failed to create user', 500));
  }
}

export async function updateUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { email, name, password, role, isActive } = req.body;

    // Check if user exists
    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Build update object
    const updates: any = {};

    if (email !== undefined) {
      updates.email = email.toLowerCase();
    }

    if (name !== undefined) {
      updates.name = name;
    }

    if (password !== undefined) {
      updates.passwordHash = await hashPassword(password);
    }

    if (role !== undefined) {
      updates.role = role;
    }

    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    // Update user
    Object.assign(user, updates);
    await user.save();

    logger.info('User updated:', { id: user._id, email: user.email });

    res.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    logger.error('Update user error:', error);
    next(createError('Failed to update user', 500));
  }
}

export async function deleteUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Prevent deleting own account
    if (id === req.user?.id) {
      res.status(403).json({ error: 'Cannot delete your own account' });
      return;
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    logger.info('User deleted:', { id });
    res.status(204).send();
  } catch (error) {
    logger.error('Delete user error:', error);
    next(createError('Failed to delete user', 500));
  }
}

export async function toggleUserActive(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Prevent disabling own account
    if (id === req.user?.id) {
      res.status(403).json({ error: 'Cannot disable your own account' });
      return;
    }

    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    user.isActive = !user.isActive;
    await user.save();

    logger.info('User active status toggled:', { id, isActive: user.isActive });

    res.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    });
  } catch (error) {
    logger.error('Toggle user active error:', error);
    next(createError('Failed to toggle user active status', 500));
  }
}
