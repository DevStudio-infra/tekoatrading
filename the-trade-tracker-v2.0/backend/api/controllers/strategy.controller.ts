import { Request, Response } from 'express';
import { strategyService } from '../../services/strategy.service';

/**
 * Create a new trading strategy
 */
export const createStrategy = async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      type,
      description, 
      parameters,
      minRiskPerTrade,
      maxRiskPerTrade,
      confidenceThreshold,
      isDefault
    } = req.body;
    
    // Validate input
    if (!name || !description || !parameters) {
      return res.status(400).json({ 
        message: 'Name, description, and parameters are required', 
        errors: {
          name: name ? undefined : 'Name is required',
          description: description ? undefined : 'Description is required',
          parameters: parameters ? undefined : 'Parameters are required'
        }
      });
    }
    
    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Create strategy with validated data
    const strategy = await strategyService.createStrategy({
      userId: String(req.user.userId),
      name,
      description,
      // Extract expected properties from parameters
      timeframes: parameters.timeframes || [],
      indicators: parameters.indicators || [],
      entryConditions: parameters.entryConditions || [],
      exitConditions: parameters.exitConditions || [],
      riskControls: parameters.riskControls || {
        maxDrawdown: minRiskPerTrade ? minRiskPerTrade / 100 : 0.5,
        trailingStopLoss: 2,
        takeProfitLevel: 3
      }
    });
    
    return res.status(201).json({
      message: 'Strategy created successfully',
      strategy,
    });
  } catch (error) {
    console.error('Error creating strategy:', error);
    return res.status(500).json({ message: 'Error creating strategy' });
  }
};

/**
 * Get all strategies for current user
 */
export const getUserStrategies = async (req: Request, res: Response) => {
  try {
    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Get strategies for current user
    const strategies = await strategyService.getUserStrategies(String(req.user.userId));
    
    return res.status(200).json({
      message: 'Strategies retrieved successfully',
      strategies,
    });
  } catch (error) {
    console.error('Error retrieving strategies:', error);
    return res.status(500).json({ message: 'Error retrieving strategies' });
  }
};

/**
 * Get a specific strategy by ID
 */
export const getStrategyById = async (req: Request, res: Response) => {
  try {
    const strategyId = req.params.id;
    
    // Validate input
    if (!strategyId) {
      return res.status(400).json({ message: 'Invalid strategy ID' });
    }
    
    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Get strategy
    const strategy = await strategyService.getStrategyById(strategyId, String(req.user.userId));
    
    if (!strategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }
    
    return res.status(200).json({
      message: 'Strategy retrieved successfully',
      strategy,
    });
  } catch (error) {
    console.error('Error retrieving strategy:', error);
    return res.status(500).json({ message: 'Error retrieving strategy' });
  }
};

/**
 * Update a strategy
 */
export const updateStrategy = async (req: Request, res: Response) => {
  try {
    const strategyId = req.params.id;
    
    // Validate input
    if (!strategyId) {
      return res.status(400).json({ message: 'Invalid strategy ID' });
    }
    
    const { 
      name, 
      type,
      description, 
      parameters,
      minRiskPerTrade,
      maxRiskPerTrade,
      confidenceThreshold,
      isDefault
    } = req.body;
    
    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Update strategy
    const strategy = await strategyService.updateStrategy(
      strategyId,
      String(req.user.userId),
      {
        name,
        type,
        description,
        parameters,
        minRiskPerTrade,
        maxRiskPerTrade,
        confidenceThreshold,
        isDefault
      }
    );
    
    return res.status(200).json({
      message: 'Strategy updated successfully',
      strategy,
    });
  } catch (error) {
    console.error('Error updating strategy:', error);
    
    // Proper error handling with type checking
    if (error instanceof Error) {
      // Check for specific error cases
      if (error.message.includes('not found') || error.message.includes('does not belong')) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes('permission')) {
        return res.status(403).json({ message: error.message });
      }
      
      return res.status(500).json({ 
        message: 'Error updating strategy', 
        error: error.message 
      });
    }
    
    // Generic error case
    return res.status(500).json({ 
      message: 'Error updating strategy',
      error: 'An unknown error occurred'
    });
  }
};

/**
 * Delete a strategy
 */
export const deleteStrategy = async (req: Request, res: Response) => {
  try {
    const strategyId = req.params.id;
    
    // Validate input
    if (!strategyId) {
      return res.status(400).json({ message: 'Invalid strategy ID' });
    }
    
    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Delete strategy
    await strategyService.deleteStrategy(strategyId, String(req.user.userId));
    
    return res.status(200).json({
      message: 'Strategy deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting strategy:', error);
    
    // Proper error handling with type checking
    if (error instanceof Error) {
      // Check for specific error cases
      if (error.message.includes('not found') || error.message.includes('does not belong')) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes('permission')) {
        return res.status(403).json({ message: error.message });
      }
      if (error.message.includes('used by bots')) {
        return res.status(400).json({ message: error.message });
      }
      
      return res.status(500).json({ 
        message: 'Error deleting strategy',
        error: error.message
      });
    }
    
    // Generic error case
    return res.status(500).json({ 
      message: 'Error deleting strategy',
      error: 'An unknown error occurred'
    });
  }
};

/**
 * Duplicate a strategy
 */
export const duplicateStrategy = async (req: Request, res: Response) => {
  try {
    const strategyId = req.params.id;
    
    // Validate input
    if (!strategyId) {
      return res.status(400).json({ message: 'Invalid strategy ID' });
    }
    
    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Get existing strategy
    const existingStrategy = await strategyService.getStrategyById(strategyId, String(req.user.userId));
    
    if (!existingStrategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }
    
    // Create a duplicate by creating a new strategy using the old one's data
    // Extract parameters from the existing strategy to match the expected interface
    const params = existingStrategy.parameters || {};
    
    const newStrategy = await strategyService.createStrategy({
      userId: String(req.user.userId),
      name: `${existingStrategy.name} (Copy)`,
      description: existingStrategy.description,
      timeframes: params.timeframes || [],
      indicators: params.indicators || [],
      entryConditions: params.entryConditions || [],
      exitConditions: params.exitConditions || [],
      riskControls: params.riskControls || {
        maxDrawdown: existingStrategy.minRiskPerTrade ? existingStrategy.minRiskPerTrade / 100 : 0.5,
        trailingStopLoss: 2,
        takeProfitLevel: 3
      }
    });
    
    return res.status(201).json({
      message: 'Strategy duplicated successfully',
      strategy: newStrategy,
    });
  } catch (error) {
    console.error('Error duplicating strategy:', error);
    
    // Proper error handling with type checking
    if (error instanceof Error) {
      // Check for specific error cases
      if (error.message.includes('not found') || error.message.includes('does not belong')) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes('permission')) {
        return res.status(403).json({ message: error.message });
      }
      
      return res.status(500).json({ 
        message: 'Error duplicating strategy',
        error: error.message 
      });
    }
    
    // Generic error case
    return res.status(500).json({ 
      message: 'Error duplicating strategy',
      error: 'An unknown error occurred'
    });
  }
};
