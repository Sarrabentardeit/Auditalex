import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserActive,
} from '../controllers/user.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validator';
import {
  createUserSchema,
  updateUserSchema,
} from '../validators/user.validator';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// All routes require admin role
router.use(requireAdmin);

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', validate(createUserSchema), createUser);
router.put('/:id', validate(updateUserSchema), updateUser);
router.delete('/:id', deleteUser);
router.patch('/:id/toggle-active', toggleUserActive);

export default router;



