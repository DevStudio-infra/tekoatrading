import { Router } from 'express';
import { schedulerService } from '../../services/scheduler.service';

const router = Router();

// Endpoint to run scheduler diagnostics
// @ts-ignore - Bypassing TypeScript error for Express route handler
router.get('/scheduler', async (req, res) => {
  try {
    console.log('[API] Running scheduler diagnostics');
    
    // Check if scheduler is running
    if (typeof schedulerService.runDiagnostics === 'function') {
      schedulerService.runDiagnostics();
      return res.status(200).json({ 
        message: 'Scheduler diagnostics complete. Check server logs for details.',
        success: true
      });
    } else {
      console.error('[API] schedulerService.runDiagnostics is not a function');
      return res.status(500).json({ 
        message: 'Scheduler diagnostics function not available',
        success: false
      });
    }
  } catch (error) {
    console.error('[API] Error running scheduler diagnostics:', error);
    return res.status(500).json({ 
      message: 'Error running scheduler diagnostics', 
      error: error instanceof Error ? error.message : String(error),
      success: false
    });
  }
});

// Endpoint to manually start scheduler
// @ts-ignore - Bypassing TypeScript error for Express route handler
router.post('/scheduler/start', (req, res) => {
  try {
    console.log('[API] Manually starting scheduler');
    schedulerService.start();
    return res.status(200).json({ 
      message: 'Scheduler started. Check server logs for details.',
      success: true
    });
  } catch (error) {
    console.error('[API] Error starting scheduler:', error);
    return res.status(500).json({ 
      message: 'Error starting scheduler', 
      error: error instanceof Error ? error.message : String(error),
      success: false
    });
  }
});

// Endpoint to manually stop scheduler
// @ts-ignore - Bypassing TypeScript error for Express route handler
router.post('/scheduler/stop', (req, res) => {
  try {
    console.log('[API] Manually stopping scheduler');
    schedulerService.stop();
    return res.status(200).json({ 
      message: 'Scheduler stopped. Check server logs for details.',
      success: true
    });
  } catch (error) {
    console.error('[API] Error stopping scheduler:', error);
    return res.status(500).json({ 
      message: 'Error stopping scheduler', 
      error: error instanceof Error ? error.message : String(error),
      success: false
    });
  }
});

module.exports = router;
