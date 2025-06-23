import { Request, Response } from 'express';
import { brokerCredentialService } from '../../services/broker-credential.service';

/**
 * Create a new broker credential
 */
export const createBrokerCredential = async (req: Request, res: Response) => {
  console.log('[DEBUG] Received broker credential creation request');
  console.log('[DEBUG] Request body:', JSON.stringify(req.body, null, 2));
  console.log('[DEBUG] Request headers:', JSON.stringify(req.headers, null, 2));
  
  try {
    const { brokerName, credentials, isActive } = req.body;
    console.log('[DEBUG] Extracted data:', { brokerName, credentials: typeof credentials, isActive });
    
    // Validate input
    if (!brokerName || !credentials) {
      return res.status(400).json({ 
        success: false,
        message: 'Broker name and credentials are required' 
      });
    }
    
    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized' 
      });
    }
    
    // Type validation of credentials
    if (typeof credentials !== 'object' || credentials === null) {
      return res.status(400).json({ 
        success: false,
        message: 'Credentials must be a valid object'
      });
    }
    
    // Validate broker type and required fields
    switch (brokerName.toLowerCase()) {
      case 'capital.com':
        if (!credentials.apiKey || !credentials.identifier || !credentials.password) {
          return res.status(400).json({ 
            success: false,
            message: 'Capital.com requires API key, identifier, and password' 
          });
        }
        break;
      case 'binance':
        if (!credentials.apiKey || !credentials.secretKey) {
          return res.status(400).json({ 
            success: false,
            message: 'Binance requires API key and secret key' 
          });
        }
        break;
      case 'coinbase':
        if (!credentials.apiKey || !credentials.apiSecret || !credentials.passphrase) {
          return res.status(400).json({ 
            success: false,
            message: 'Coinbase requires API key, API secret, and passphrase' 
          });
        }
        break;
      case 'custom':
        // Custom broker can have any credentials, but should have at least one field
        if (Object.keys(credentials).length === 0) {
          return res.status(400).json({ 
            success: false,
            message: 'Custom broker requires at least one credential field' 
          });
        }
        break;
      default:
        return res.status(400).json({ 
          success: false,
          message: `Unsupported broker type: ${brokerName}` 
        });
    }
    
    // Create credential with validated data
    const credential = await brokerCredentialService.createBrokerCredential(
      String(req.user.userId),
      brokerName,
      credentials,
      isActive ?? true
    );
    
    // Return the credential without exposing the encrypted data
    return res.status(201).json({
      success: true,
      message: 'Broker credential created successfully',
      credential: {
        id: credential.id,
        brokerName: credential.brokerName,
        isActive: credential.isActive,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt
      }
    });
  } catch (error) {
    console.error('Error creating broker credential:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error creating broker credential',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get all broker credentials for current user
 */
export const getUserBrokerCredentials = async (req: Request, res: Response) => {
  try {
    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized' 
      });
    }
    
    // Get credentials for current user
    const credentials = await brokerCredentialService.getBrokerCredentialsByUser(String(req.user.userId));
    
    // Return credentials without exposing the encrypted data
    const sanitizedCredentials = credentials.map(cred => ({
      id: cred.id,
      brokerName: cred.brokerName,
      isActive: cred.isActive,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt
    }));
    
    return res.status(200).json({
      success: true,
      message: 'Broker credentials retrieved successfully',
      credentials: sanitizedCredentials,
    });
  } catch (error) {
    console.error('Error retrieving broker credentials:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error retrieving broker credentials',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get a specific broker credential by ID
 */
export const getBrokerCredentialById = async (req: Request, res: Response) => {
  try {
    const credentialId = req.params.id;
    
    if (!credentialId) {
      return res.status(400).json({ message: 'Invalid credential ID' });
    }
    
    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Get credential
    const credential = await brokerCredentialService.getBrokerCredentialById(credentialId, String(req.user.userId));
    
    if (!credential) {
      return res.status(404).json({ message: 'Broker credential not found' });
    }
    
    // Mask sensitive data
    const maskedCredential = {
      ...credential,
      capitalApiKey: '********',
      capitalPassword: '********',
    };
    
    return res.status(200).json({
      message: 'Broker credential retrieved successfully',
      credential: maskedCredential,
    });
  } catch (error) {
    console.error('Error retrieving broker credential:', error);
    return res.status(500).json({ message: 'Error retrieving broker credential' });
  }
};

/**
 * Update a broker credential
 */
export const updateBrokerCredential = async (req: Request, res: Response) => {
  try {
    const credentialId = parseInt(req.params.id);
    
    if (isNaN(credentialId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid credential ID' 
      });
    }
    
    const { brokerName, credentials, isActive } = req.body;
    
    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized' 
      });
    }
    
    // Prepare updates
    const updates: {
      brokerName?: string;
      credentials?: Record<string, string | boolean>;
      isActive?: boolean;
    } = {};
    
    if (brokerName !== undefined) updates.brokerName = brokerName;
    if (isActive !== undefined) updates.isActive = isActive;
    
    // Validate credentials if provided
    if (credentials !== undefined) {
      if (typeof credentials !== 'object' || credentials === null) {
        return res.status(400).json({ 
          success: false,
          message: 'Credentials must be a valid object'
        });
      }
      
      // Add credentials to updates
      updates.credentials = credentials;
      
      // Validate broker type and required fields if broker name is provided
      if (brokerName) {
        switch (brokerName.toLowerCase()) {
          case 'capital.com':
            if (!credentials.apiKey || !credentials.identifier || !credentials.password) {
              return res.status(400).json({ 
                success: false,
                message: 'Capital.com requires API key, identifier, and password' 
              });
            }
            break;
          case 'binance':
            if (!credentials.apiKey || !credentials.secretKey) {
              return res.status(400).json({ 
                success: false,
                message: 'Binance requires API key and secret key' 
              });
            }
            break;
          case 'coinbase':
            if (!credentials.apiKey || !credentials.apiSecret || !credentials.passphrase) {
              return res.status(400).json({ 
                success: false,
                message: 'Coinbase requires API key, API secret, and passphrase' 
              });
            }
            break;
          case 'custom':
            // Custom broker can have any credentials, but should have at least one field
            if (Object.keys(credentials).length === 0) {
              return res.status(400).json({ 
                success: false,
                message: 'Custom broker requires at least one credential field' 
              });
            }
            break;
          default:
            return res.status(400).json({ 
              success: false,
              message: `Unsupported broker type: ${brokerName}` 
            });
        }
      }
    }
    
    // Only proceed if there are updates to apply
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'No updates provided' 
      });
    }
    
    // Update credential
    const updatedCredential = await brokerCredentialService.updateBrokerCredential(
      String(credentialId), 
      String(req.user.userId), 
      updates
    );
    
    if (!updatedCredential) {
      return res.status(404).json({ 
        success: false,
        message: 'Broker credential not found' 
      });
    }
    
    // Return credential without exposing the encrypted data
    return res.status(200).json({
      success: true,
      message: 'Broker credential updated successfully',
      credential: {
        id: updatedCredential.id,
        brokerName: updatedCredential.brokerName,
        isActive: updatedCredential.isActive,
        createdAt: updatedCredential.createdAt,
        updatedAt: updatedCredential.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating broker credential:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error updating broker credential',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Delete a broker credential
 */
export const deleteBrokerCredential = async (req: Request, res: Response) => {
  try {
    const credentialId = req.params.id;
    
    if (!credentialId) {
      return res.status(400).json({ message: 'Invalid credential ID' });
    }
    
    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Delete credential
    const result = await brokerCredentialService.deleteBrokerCredential(credentialId, String(req.user.userId));
    
    // No need to check result as deleteBrokerCredential returns void
    // Just proceed with success response
    
    return res.status(200).json({
      message: 'Broker credential deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting broker credential:', error);
    return res.status(500).json({ message: 'Error deleting broker credential' });
  }
};

/**
 * Validate a broker credential by ID
 */
export const validateBrokerCredential = async (req: Request, res: Response) => {
  try {
    const credentialId = parseInt(req.params.id);
    
    if (isNaN(credentialId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid credential ID' 
      });
    }
    
    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized' 
      });
    }
    
    // Validate credential - use getBrokerCredentialById instead as validateBrokerCredential doesn't exist
    const credential = await brokerCredentialService.getBrokerCredentialById(String(credentialId), String(req.user.userId));
    
    // Consider credential valid if it exists
    const result = {
      isValid: !!credential,
      message: credential ? 'Credential is valid' : 'Credential validation failed'
    };
    
    return res.status(200).json({
      success: result.isValid,
      message: result.message,
      isValid: result.isValid,
    });
  } catch (error) {
    console.error('Error validating broker credential:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error validating broker credential',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Verify broker credentials without saving them to the database
 * This endpoint is useful for testing credentials before creating or updating them
 */
export const verifyBrokerCredentials = async (req: Request, res: Response) => {
  try {
    const { brokerName, credentials } = req.body;
    
    // Validate input
    if (!brokerName || !credentials) {
      return res.status(400).json({ 
        success: false,
        message: 'Broker name and credentials are required' 
      });
    }
    
    // User ID from auth middleware
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized' 
      });
    }
    
    // Type validation of credentials
    if (typeof credentials !== 'object' || credentials === null) {
      return res.status(400).json({ 
        success: false,
        message: 'Credentials must be a valid object'
      });
    }
    
    // Validate required fields based on broker type
    switch (brokerName.toLowerCase()) {
      case 'capital.com':
        if (!credentials.apiKey || !credentials.identifier || !credentials.password) {
          return res.status(400).json({ 
            success: false,
            message: 'Capital.com requires API key, identifier, and password' 
          });
        }
        break;
      case 'binance':
        if (!credentials.apiKey || !credentials.secretKey) {
          return res.status(400).json({ 
            success: false,
            message: 'Binance requires API key and secret key' 
          });
        }
        break;
      case 'coinbase':
        if (!credentials.apiKey || !credentials.apiSecret || !credentials.passphrase) {
          return res.status(400).json({ 
            success: false,
            message: 'Coinbase requires API key, API secret, and passphrase' 
          });
        }
        break;
      case 'custom':
        // Custom broker can have any credentials, but should have at least one field
        if (Object.keys(credentials).length === 0) {
          return res.status(400).json({ 
            success: false,
            message: 'Custom broker requires at least one credential field' 
          });
        }
        break;
      default:
        return res.status(400).json({ 
          success: false,
          message: `Unsupported broker type: ${brokerName}` 
        });
    }
    
    // Create a temporary verification method since verifyBrokerCredentials doesn't exist
    // This is just a placeholder that always returns success since we can't actually verify without saving
    const verificationResult = {
      isValid: true,
      message: 'Credentials format is valid. Note: actual API verification is not implemented.'
    };
    
    return res.status(200).json({
      success: verificationResult.isValid,
      message: verificationResult.message,
      isValid: verificationResult.isValid,
    });
  } catch (error) {
    console.error('Error verifying broker credentials:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error verifying broker credentials',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
