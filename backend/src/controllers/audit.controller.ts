import { Response, NextFunction } from 'express';
import { Audit } from '../models/Audit.model';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export async function getAllAudits(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    let audits;

    if (role === 'admin') {
      // Admin can see all audits with auditor info
      audits = await Audit.find()
        .populate('auditorId', 'name email')
        .sort({ createdAt: -1 });
    } else {
      // Auditeurs : leurs audits avec infos auditeur
      audits = await Audit.find({ auditorId: userId })
        .populate('auditorId', 'name email')
        .sort({ createdAt: -1 });
    }

    res.json({
      audits: audits.map((audit) => {
        // Si auditorId est populé, c'est un objet avec _id, name, email
        // Sinon, c'est juste l'ObjectId
        const auditorIdValue = typeof audit.auditorId === 'object' && audit.auditorId !== null
          ? ((audit.auditorId as any)._id?.toString() || (audit.auditorId as any).toString())
          : String(audit.auditorId);
        
        const auditorName = typeof audit.auditorId === 'object' && audit.auditorId !== null
          ? (audit.auditorId as any).name
          : undefined;
        
        const auditorEmail = typeof audit.auditorId === 'object' && audit.auditorId !== null
          ? (audit.auditorId as any).email
          : undefined;
        
        return {
          id: audit._id.toString(),
          auditorId: auditorIdValue,
          auditorName,
          auditorEmail,
          dateExecution: audit.dateExecution,
          adresse: audit.adresse,
          categories: audit.categories,
          correctiveActions: audit.correctiveActions,
          status: audit.status,
          completedAt: audit.completedAt,
          createdAt: audit.createdAt,
          updatedAt: audit.updatedAt,
          synced: audit.synced,
        };
      }),
    });
  } catch (error) {
    logger.error('Get all audits error:', error);
    next(createError('Failed to fetch audits', 500));
  }
}

export async function getAuditById(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;

    let audit;

    if (role === 'admin') {
      audit = await Audit.findById(id).populate('auditorId', 'name email');
    } else {
      audit = await Audit.findOne({ _id: id, auditorId: userId }).populate('auditorId', 'name email');
    }

    if (!audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    res.json({
      id: audit._id.toString(),
      auditorId: audit.auditorId.toString(),
      auditorName: (audit.auditorId as any).name,
      auditorEmail: (audit.auditorId as any).email,
      dateExecution: audit.dateExecution,
      adresse: audit.adresse,
      status: audit.status,
      completedAt: audit.completedAt,
      categories: audit.categories,
      correctiveActions: audit.correctiveActions,
      createdAt: audit.createdAt,
      updatedAt: audit.updatedAt,
      synced: audit.synced,
    });
  } catch (error) {
    logger.error('Get audit by ID error:', error);
    next(createError('Failed to fetch audit', 500));
  }
}

export async function createAudit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { dateExecution, adresse, categories, correctiveActions, status, completedAt } = req.body;

    // Utiliser le statut fourni, ou 'in_progress' par défaut
    // Si status === 'completed', c'est qu'on finalise directement un audit
    const auditStatus = status || 'in_progress';

    const auditData: any = {
      auditorId: userId,
      dateExecution: new Date(dateExecution),
      adresse: adresse || null,
      categories,
      correctiveActions: correctiveActions || [],
      status: auditStatus,
    };

    // Ajouter completedAt si le statut est 'completed'
    if (auditStatus === 'completed' && completedAt) {
      try {
        auditData.completedAt = new Date(completedAt);
      } catch (e) {
        logger.warn('Invalid completedAt date format:', completedAt);
      }
    }

    const audit = await Audit.create(auditData);

    logger.info('Audit created:', { id: audit._id, auditorId: userId, status: audit.status });

    res.status(201).json({
      id: audit._id.toString(),
      auditorId: audit.auditorId.toString(),
      dateExecution: audit.dateExecution,
      adresse: audit.adresse,
      categories: audit.categories,
      correctiveActions: audit.correctiveActions,
      status: audit.status,
      completedAt: audit.completedAt,
      createdAt: audit.createdAt,
      updatedAt: audit.updatedAt,
      synced: audit.synced,
    });
  } catch (error) {
    logger.error('Create audit error:', error);
    next(createError('Failed to create audit', 500));
  }
}

export async function updateAudit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;
    const { dateExecution, adresse, categories, correctiveActions, status, completedAt } = req.body;

    // Check if audit exists and user has permission
    let audit;
    if (role === 'admin') {
      audit = await Audit.findById(id);
    } else {
      audit = await Audit.findOne({ _id: id, auditorId: userId });
    }

    if (!audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    // Update fields
    if (dateExecution !== undefined && dateExecution !== null) {
      try {
        audit.dateExecution = new Date(dateExecution);
      } catch (e) {
        logger.warn('Invalid date format:', dateExecution);
        // Garder la date actuelle si le format est invalide
      }
    }

    if (adresse !== undefined) {
      audit.adresse = adresse || null; // Permettre les chaînes vides
    }

    if (categories !== undefined) {
      audit.categories = categories;
    }

    if (correctiveActions !== undefined) {
      audit.correctiveActions = correctiveActions;
    }

    if (status !== undefined) {
      audit.status = status;
      logger.info('Status updated:', { id: audit._id, status });
    }

    if (completedAt !== undefined && completedAt !== null) {
      try {
        audit.completedAt = new Date(completedAt);
        logger.info('CompletedAt updated:', { id: audit._id, completedAt });
      } catch (e) {
        logger.warn('Invalid completedAt date format:', completedAt);
      }
    }

    await audit.save();

    logger.info('Audit updated:', { id: audit._id, status: audit.status, completedAt: audit.completedAt });

    res.json({
      id: audit._id.toString(),
      auditorId: audit.auditorId.toString(),
      dateExecution: audit.dateExecution,
      adresse: audit.adresse,
      categories: audit.categories,
      correctiveActions: audit.correctiveActions,
      status: audit.status,
      completedAt: audit.completedAt,
      createdAt: audit.createdAt,
      updatedAt: audit.updatedAt,
      synced: audit.synced,
    });
  } catch (error) {
    logger.error('Update audit error:', error);
    next(createError('Failed to update audit', 500));
  }
}

export async function deleteAudit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;

    // Check if audit exists and user has permission
    let audit;
    if (role === 'admin') {
      audit = await Audit.findById(id);
    } else {
      audit = await Audit.findOne({ _id: id, auditorId: userId });
    }

    if (!audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    await Audit.findByIdAndDelete(id);
    logger.info('Audit deleted:', { id });

    res.status(204).send();
  } catch (error) {
    logger.error('Delete audit error:', error);
    next(createError('Failed to delete audit', 500));
  }
}
