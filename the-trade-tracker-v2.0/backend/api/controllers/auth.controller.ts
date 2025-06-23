import { Request, Response } from 'express';
import { authService } from '../../services/auth.service';

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Register user
    const result = await authService.register({ email, password, firstName, lastName });
    
    // Remove password from response
    const { password: _, ...user } = result.user;
    
    // Return user and token
    return res.status(201).json({
      message: 'User registered successfully',
      user,
      token: result.token,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Check for duplicate email
    if (error.message?.includes('duplicate key') && error.message?.includes('email')) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    
    return res.status(500).json({ message: 'Error registering user' });
  }
};

/**
 * Login a user
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Login user
    const result = await authService.login(email, password);
    
    if (!result) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Remove password from response
    const { password: _, ...user } = result.user;
    
    // Return user and token
    return res.status(200).json({
      message: 'Login successful',
      user,
      token: result.token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Error logging in' });
  }
};

/**
 * Get current user (profile)
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    // User is attached to request from auth middleware
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    return res.status(200).json({
      message: 'Profile retrieved successfully',
      user: req.user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Error retrieving profile' });
  }
};
