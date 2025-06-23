import { Router } from 'express';
import * as tradingPairController from '../controllers/trading-pair.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All trading pair routes require authentication
router.use(authenticate as any);

// Get all trading pairs and search
router.get('/', tradingPairController.getAllTradingPairs as any);
router.get('/search', tradingPairController.searchTradingPairs as any);
router.get('/popular', tradingPairController.getPopularTradingPairs as any);
router.get('/categories', tradingPairController.getCategories as any);

// Get trading pairs by broker
router.get('/broker/:brokerName', tradingPairController.getTradingPairsByBroker as any);

// Get specific trading pair
router.get('/id/:id', tradingPairController.getTradingPairById as any);
router.get('/symbol/:symbol', tradingPairController.getTradingPairBySymbol as any);

export default router;
