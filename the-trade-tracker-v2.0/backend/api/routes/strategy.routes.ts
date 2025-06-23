import { Router } from 'express';
import * as strategyController from '../controllers/strategy.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All strategy routes require authentication
router.use(authenticate as any);

// Strategy management routes
router.post('/', strategyController.createStrategy as any);
router.get('/', strategyController.getUserStrategies as any);
router.get('/:id', strategyController.getStrategyById as any);
router.put('/:id', strategyController.updateStrategy as any);
router.delete('/:id', strategyController.deleteStrategy as any);

// Additional strategy operations
router.post('/:id/duplicate', strategyController.duplicateStrategy as any);

export default router;
