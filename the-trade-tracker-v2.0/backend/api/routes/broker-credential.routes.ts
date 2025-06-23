import { Router } from 'express';
import * as brokerCredentialController from '../controllers/broker-credential.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All broker credential routes require authentication
router.use(authenticate as any);

// Broker credential management routes
router.post('/', brokerCredentialController.createBrokerCredential as any);
router.get('/', brokerCredentialController.getUserBrokerCredentials as any);
router.get('/:id', brokerCredentialController.getBrokerCredentialById as any);
router.put('/:id', brokerCredentialController.updateBrokerCredential as any);
router.delete('/:id', brokerCredentialController.deleteBrokerCredential as any);

// Broker credential operations
router.post('/:id/validate', brokerCredentialController.validateBrokerCredential as any);

// Credential verification without persistence
router.post('/verify', brokerCredentialController.verifyBrokerCredentials as any);

export default router;
