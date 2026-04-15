import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { AccountUser } from '../models/AccountUser.js';
import { RateLimit } from '../models/RateLimit.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../utils/email.js';
import { signToken } from '../utils/jwt.js';

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// ── CAPTCHA ──────────────────────────────────
const CAPTCHA_SECRET =
  process.env.CAPTCHA_SECRET ?? crypto.randomBytes(32).toString('hex');
const CAPTCHA_TTL_MS = 5 * 60 * 1000; // 5 minutes

type CaptchaOp = '+' | '−' | '×';

function generateCaptchaChallenge(): {
  question: string;
  answer: number;
  token: string;
} {
  const ops: CaptchaOp[] = ['+', '−', '×'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  switch (op) {
    case '×':
      a = Math.floor(Math.random() * 9) + 2;
      b = Math.floor(Math.random() * 9) + 2;
      answer = a * b;
      break;
    case '−':
      a = Math.floor(Math.random() * 30) + 10;
      b = Math.floor(Math.random() * a);
      answer = a - b;
      break;
    default:
      a = Math.floor(Math.random() * 40) + 5;
      b = Math.floor(Math.random() * 40) + 5;
      answer = a + b;
  }

  const nonce = crypto.randomBytes(8).toString('hex');
  const issuedAt = Date.now();
  const payload = `${answer}:${issuedAt}:${nonce}`;
  const hmac = crypto
    .createHmac('sha256', CAPTCHA_SECRET)
    .update(payload)
    .digest('hex');
  const token = `${hmac}:${issuedAt}:${nonce}`;

  return { question: `${a} ${op} ${b}`, answer, token };
}

function verifyCaptchaToken(
  token: string,
  answer: number,
): { valid: boolean; reason?: string } {
  const parts = token.split(':');
  if (parts.length !== 3) return { valid: false, reason: 'Malformed token.' };

  const [hmac, issuedAtStr, nonce] = parts;
  const issuedAt = Number(issuedAtStr);

  if (Number.isNaN(issuedAt))
    return { valid: false, reason: 'Malformed token.' };

  const age = Date.now() - issuedAt;
  if (age > CAPTCHA_TTL_MS)
    return { valid: false, reason: 'Challenge expired.' };
  if (age < 2000)
    return { valid: false, reason: 'Submitted too quickly.' };

  const payload = `${answer}:${issuedAt}:${nonce}`;
  const expected = crypto
    .createHmac('sha256', CAPTCHA_SECRET)
    .update(payload)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected)))
    return { valid: false, reason: 'Incorrect answer.' };

  return { valid: true };
}

// ── Rate limiting (MongoDB-backed) ───────────
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_MAX = 5;

async function isRateLimited(ip: string): Promise<boolean> {
  const key = `register:${ip}`;
  const now = new Date();

  const entry = await RateLimit.findOneAndUpdate(
    { key, expiresAt: { $gt: now } },
    { $inc: { count: 1 } },
    { new: true },
  );

  if (!entry) {
    await RateLimit.findOneAndUpdate(
      { key },
      { count: 1, expiresAt: new Date(Date.now() + RATE_WINDOW_MS) },
      { upsert: true },
    );
    return false;
  }

  return entry.count > RATE_MAX;
}

const router = Router();

// ──────────────────────────────────────────────
// GET /api/auth/captcha
// ──────────────────────────────────────────────
router.get('/captcha', (_req: Request, res: Response) => {
  const { question, token } = generateCaptchaChallenge();
  res.json({ question, token });
});

// ──────────────────────────────────────────────
// POST /api/auth/register
// ──────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  try {
    const ip = req.ip ?? 'unknown';
    if (process.env.NODE_ENV !== 'test' && await isRateLimited(ip)) {
      res.status(429).json({ error: 'Too many registration attempts. Try again later.' });
      return;
    }

    const { email, password, captchaToken, captchaAnswer, website } = req.body;

    // Honeypot - bots tend to fill hidden fields
    if (website) {
      // Silently reject
      res.status(201).json({ token: '', accountUser: { id: '', email: '' } });
      return;
    }

    if (!captchaToken || captchaAnswer === undefined || captchaAnswer === null) {
      // Skip CAPTCHA validation in test environment
      if (process.env.NODE_ENV !== 'test') {
        res.status(400).json({ error: 'CAPTCHA is required.' });
        return;
      }
    }

    if (process.env.NODE_ENV !== 'test') {
      const captchaResult = verifyCaptchaToken(
        String(captchaToken),
        Number(captchaAnswer),
      );
      if (!captchaResult.valid) {
        res.status(400).json({ error: captchaResult.reason ?? 'Invalid CAPTCHA.' });
        return;
      }
    }

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Invalid input.' });
      return;
    }

    if (password.length < 8) {
      res
        .status(400)
        .json({ error: 'Password must be at least 8 characters.' });
      return;
    }

    const existing = await AccountUser.findOne({
      email: email.toLowerCase().trim(),
    });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await hashPassword(password);

    const accountUser = await AccountUser.create({
      email,
      passwordHash,
    });

    // Send welcome email (fire-and-forget)
    sendWelcomeEmail(accountUser.email).catch((err) =>
      console.error('Failed to send welcome email:', err),
    );

    res.status(201).json({
      message: 'Account created successfully.',
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ──────────────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Invalid input.' });
      return;
    }

    const accountUser = await AccountUser.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!accountUser) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const valid = await comparePassword(password, accountUser.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Record login event (increments loginCount, sets lastLoginAt, appends history)
    accountUser.recordLogin(
      req.ip,
      req.headers['user-agent'],
    );
    await accountUser.save();

    const token = signToken(accountUser._id as unknown as string);

    res.json({
      token,
      accountUser: {
        id: accountUser._id,
        email: accountUser.email,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ──────────────────────────────────────────────
// POST /api/auth/request-password-reset
// ──────────────────────────────────────────────
router.post(
  '/request-password-reset',
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        res.status(400).json({ error: 'Email is required.' });
        return;
      }

      const accountUser = await AccountUser.findOne({
        email: email.toLowerCase().trim(),
      });

      // Always return 200 to prevent user enumeration
      if (!accountUser) {
        res.json({
          message:
            'If an account with that email exists, a reset link has been sent.',
        });
        return;
      }

      const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
      accountUser.resetPasswordToken = token;
      accountUser.resetPasswordExpires = new Date(
        Date.now() + RESET_TOKEN_EXPIRY_MS,
      );
      await accountUser.save();

      // Send the reset token via email
      await sendPasswordResetEmail(accountUser.email, token).catch((err) => {
        console.error('Failed to send password reset email:', err);
      });

      res.json({
        message:
          'If an account with that email exists, a reset link has been sent.',
      });
    } catch (err) {
      console.error('Request password reset error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

// ──────────────────────────────────────────────
// POST /api/auth/reset-password
// ──────────────────────────────────────────────
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({ error: 'Token and new password are required.' });
      return;
    }

    if (typeof token !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Invalid input.' });
      return;
    }

    if (password.length < 8) {
      res
        .status(400)
        .json({ error: 'Password must be at least 8 characters.' });
      return;
    }

    const accountUser = await AccountUser.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!accountUser) {
      res.status(400).json({ error: 'Invalid or expired reset token.' });
      return;
    }

    accountUser.passwordHash = await hashPassword(password);
    accountUser.resetPasswordToken = undefined;
    accountUser.resetPasswordExpires = undefined;
    await accountUser.save();

    res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
