import { Router, type Response } from 'express';
import {
  MeasurementProfile,
  MAX_MEASUREMENT_PROFILES,
} from '../models/MeasurementProfile.js';
import {
  requireAuth,
  type AuthenticatedRequest,
} from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ──────────────────────────────────────────────
// GET /api/measurement-profiles
// ──────────────────────────────────────────────
router.get('/', async (req, res: Response) => {
  try {
    const { accountUser } = req as AuthenticatedRequest;
    const profiles = await MeasurementProfile.find({
      accountUserId: accountUser._id,
    }).sort({ updatedAt: -1 });

    res.json(profiles);
  } catch (err) {
    console.error('List measurement profiles error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ──────────────────────────────────────────────
// POST /api/measurement-profiles
// ──────────────────────────────────────────────
router.post('/', async (req, res: Response) => {
  try {
    const { accountUser } = req as AuthenticatedRequest;

    const count = await MeasurementProfile.countDocuments({
      accountUserId: accountUser._id,
    });

    if (count >= MAX_MEASUREMENT_PROFILES) {
      res.status(400).json({
        error: `You can have at most ${MAX_MEASUREMENT_PROFILES} measurement profiles.`,
      });
      return;
    }

    const { name, profileType, notes, measurements } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Name is required.' });
      return;
    }

    const profile = await MeasurementProfile.create({
      accountUserId: accountUser._id,
      name,
      profileType,
      notes,
      measurements,
    });

    res.status(201).json(profile);
  } catch (err) {
    console.error('Create measurement profile error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ──────────────────────────────────────────────
// PUT /api/measurement-profiles/:id
// ──────────────────────────────────────────────
router.put('/:id', async (req, res: Response) => {
  try {
    const { accountUser } = req as unknown as AuthenticatedRequest;

    const profile = await MeasurementProfile.findOne({
      _id: req.params.id,
      accountUserId: accountUser._id,
    });

    if (!profile) {
      res.status(404).json({ error: 'Measurement profile not found.' });
      return;
    }

    const { name, profileType, notes, measurements } = req.body;

    if (name !== undefined) profile.name = name;
    if (profileType !== undefined) profile.profileType = profileType;
    if (notes !== undefined) profile.notes = notes;
    if (measurements !== undefined) profile.measurements = measurements;

    await profile.save();

    res.json(profile);
  } catch (err) {
    console.error('Update measurement profile error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/measurement-profiles/:id
// ──────────────────────────────────────────────
router.delete('/:id', async (req, res: Response) => {
  try {
    const { accountUser } = req as unknown as AuthenticatedRequest;

    const result = await MeasurementProfile.findOneAndDelete({
      _id: req.params.id,
      accountUserId: accountUser._id,
    });

    if (!result) {
      res.status(404).json({ error: 'Measurement profile not found.' });
      return;
    }

    res.json({ message: 'Measurement profile deleted.' });
  } catch (err) {
    console.error('Delete measurement profile error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ──────────────────────────────────────────────
// POST /api/measurement-profiles/import
// One-time localStorage → DB migration
// ──────────────────────────────────────────────
router.post('/import', async (req, res: Response) => {
  try {
    const { accountUser } = req as AuthenticatedRequest;
    const { profiles } = req.body;

    if (!Array.isArray(profiles)) {
      res
        .status(400)
        .json({ error: 'Request body must contain a "profiles" array.' });
      return;
    }

    const existingCount = await MeasurementProfile.countDocuments({
      accountUserId: accountUser._id,
    });

    // Only allow import when user has zero DB profiles
    if (existingCount > 0) {
      res.json({ imported: 0, skipped: profiles.length });
      return;
    }

    const slotsAvailable = MAX_MEASUREMENT_PROFILES - existingCount;
    const toImport = profiles.slice(0, slotsAvailable);
    const skipped = profiles.length - toImport.length;

    const docs = toImport
      .filter(
        (p: unknown): p is Record<string, unknown> =>
          typeof p === 'object' && p !== null && typeof (p as Record<string, unknown>).name === 'string',
      )
      .map((p: Record<string, unknown>) => ({
        accountUserId: accountUser._id,
        name: String(p.name),
        profileType:
          p.profileType === 'men' || p.profileType === 'women'
            ? p.profileType
            : 'women',
        notes: typeof p.notes === 'string' ? p.notes : undefined,
        measurements:
          typeof p.measurements === 'object' && p.measurements !== null
            ? p.measurements
            : {},
      }));

    let imported = 0;
    if (docs.length > 0) {
      const result = await MeasurementProfile.insertMany(docs);
      imported = result.length;
    }

    res.json({
      imported,
      skipped: skipped + (toImport.length - docs.length),
    });
  } catch (err) {
    console.error('Import measurement profiles error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
