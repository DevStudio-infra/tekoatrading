import { Request, Response } from 'express';
import { tradingPairService } from '../../services/trading-pair.service';

/**
 * Get all trading pairs
 */
export const getAllTradingPairs = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    const pairs = await tradingPairService.getAllTradingPairs(limit, offset);
    
    return res.status(200).json({
      success: true,
      message: 'Trading pairs retrieved successfully',
      pairs,
      count: pairs.length,
    });
  } catch (error) {
    console.error('Error retrieving trading pairs:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error retrieving trading pairs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get trading pairs by broker
 */
export const getTradingPairsByBroker = async (req: Request, res: Response) => {
  try {
    const { brokerName } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    if (!brokerName) {
      return res.status(400).json({ 
        success: false,
        message: 'Broker name is required' 
      });
    }
    
    const pairs = await tradingPairService.getTradingPairsByBroker(brokerName, limit, offset);
    
    return res.status(200).json({
      success: true,
      message: `Trading pairs for broker ${brokerName} retrieved successfully`,
      pairs,
      count: pairs.length,
    });
  } catch (error) {
    console.error('Error retrieving trading pairs by broker:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error retrieving trading pairs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Search trading pairs
 */
export const searchTradingPairs = async (req: Request, res: Response) => {
  try {
    const { query, brokerName, category } = req.query as { 
      query?: string;
      brokerName?: string;
      category?: string;
    };
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ 
        success: false,
        message: 'Search query must be at least 2 characters' 
      });
    }
    
    // Get pairs based on available criteria
    let pairs: any[] = [];
    
    // If category is provided, use category filter
    if (category) {
      pairs = await tradingPairService.getTradingPairsByCategory(category, limit, offset);
    } 
    // If broker name is provided, use broker filter
    else if (brokerName) {
      pairs = await tradingPairService.getTradingPairsByBroker(brokerName, limit, offset);
    } 
    // Otherwise get all pairs
    else {
      pairs = await tradingPairService.getAllTradingPairs(limit, offset);
    }
    
    // Filter results by query string
    pairs = pairs.filter(pair => {
      const searchText = `${pair.symbol} ${pair.name || ''} ${pair.description || ''}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });
    
    return res.status(200).json({
      success: true,
      message: 'Trading pairs search completed successfully',
      pairs,
      count: pairs.length,
    });
  } catch (error) {
    console.error('Error searching trading pairs:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error searching trading pairs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get trading pair by ID
 */
export const getTradingPairById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid trading pair ID' 
      });
    }
    
    const pair = await tradingPairService.getTradingPairById(id);
    
    if (!pair) {
      return res.status(404).json({ 
        success: false,
        message: 'Trading pair not found' 
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Trading pair retrieved successfully',
      pair,
    });
  } catch (error) {
    console.error('Error retrieving trading pair by ID:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error retrieving trading pair',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get trading pair by symbol
 */
export const getTradingPairBySymbol = async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ 
        success: false,
        message: 'Symbol is required' 
      });
    }
    
    const pair = await tradingPairService.getTradingPairBySymbol(symbol);
    
    if (!pair) {
      return res.status(404).json({ 
        success: false,
        message: 'Trading pair not found' 
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Trading pair retrieved successfully',
      pair,
    });
  } catch (error) {
    console.error('Error retrieving trading pair by symbol:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error retrieving trading pair',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get popular trading pairs
 */
export const getPopularTradingPairs = async (req: Request, res: Response) => {
  try {
    const { brokerName } = req.query as { brokerName?: string };
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    const pairs = await tradingPairService.getPopularTradingPairs(brokerName, limit);
    
    return res.status(200).json({
      success: true,
      message: 'Popular trading pairs retrieved successfully',
      pairs,
      count: pairs.length,
    });
  } catch (error) {
    console.error('Error retrieving popular trading pairs:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error retrieving popular trading pairs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get available categories
 */
export const getCategories = async (req: Request, res: Response) => {
  try {
    const { brokerName } = req.query as { brokerName?: string };
    
    const categories = await tradingPairService.getCategories(brokerName);
    
    return res.status(200).json({
      success: true,
      message: 'Trading pair categories retrieved successfully',
      categories,
      count: categories.length,
    });
  } catch (error) {
    console.error('Error retrieving trading pair categories:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error retrieving trading pair categories',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
