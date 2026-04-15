import { Router, type Response } from 'express';
import { MeasurementProfile } from '../models/MeasurementProfile.js';
import {
  requireAuth,
  type AuthenticatedRequest,
} from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// ──────────────────────────────────────────────
// GET /api/me
// ──────────────────────────────────────────────
router.get('/', async (req, res: Response) => {
  try {
    const { accountUser } = req as AuthenticatedRequest;

    const measurementProfileCount = await MeasurementProfile.countDocuments({
      accountUserId: accountUser._id,
    });

    res.json({
      id: accountUser._id,
      email: accountUser.email,
      loginCount: accountUser.loginCount,
      lastLoginAt: accountUser.lastLoginAt,
      loginHistory: accountUser.loginHistory.slice(-10),
      measurementProfileCount,
    });
  } catch (err) {
    console.error('Get account info error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
