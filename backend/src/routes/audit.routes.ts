import { Router } from 'express';
import {
  getAllAudits,
  getAuditById,
  createAudit,
  updateAudit,
  deleteAudit,
} from '../controllers/audit.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';
import {
  createAuditSchema,
  updateAuditSchema,
} from '../validators/audit.validator';

const router = Router();

// All audit routes require authentication
router.use(authenticate);

router.get('/', getAllAudits);
router.get('/:id', getAuditById);
router.post('/', validate(createAuditSchema), createAudit);
router.put('/:id', validate(updateAuditSchema), updateAudit);
router.delete('/:id', deleteAudit);

export default router;

