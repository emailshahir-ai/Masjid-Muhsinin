import 'dotenv/config';
import crypto from 'crypto';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 10;

// Session signing secret: reads server env var or generates an ephemeral in-memory key
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

interface ClaimedCredential {
  salt: string;
  hashHex: string;
  claimedAt: string;
}

// One-time first-run claimed credential hash stored strictly in server memory
// Always overridden whenever process.env.ADMIN_PASSCODE is configured
let claimedAdminCredential: ClaimedCredential | null = null;
let setupClaimLock = false;

// Revoked session JTIs (cleared periodically when expired)
const revokedTokens = new Map<string, number>();

// Simple per-IP login rate limiter
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function getEnvPasscode(): string | null {
  const val = process.env.ADMIN_PASSCODE?.trim();
  return val && val.length > 0 ? val : null;
}

function hashPasswordScrypt(password: string, saltHex: string): Buffer {
  return crypto.scryptSync(password, saltHex, 64, { N: 16384, r: 8, p: 1 });
}

function timingSafeCompareStrings(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function verifyPasswordAgainstServer(password: string): boolean {
  const envPasscode = getEnvPasscode();
  if (envPasscode) {
    return timingSafeCompareStrings(password, envPasscode);
  }
  if (!claimedAdminCredential) {
    return false;
  }
  const derived = hashPasswordScrypt(password, claimedAdminCredential.salt);
  const stored = Buffer.from(claimedAdminCredential.hashHex, 'hex');
  if (derived.length !== stored.length) return false;
  return crypto.timingSafeEqual(derived, stored);
}

interface SessionPayload {
  sub: 'admin';
  jti: string;
  iat: number;
  exp: number;
}

function signSessionToken(): string {
  const now = Date.now();
  const payload: SessionPayload = {
    sub: 'admin',
    jti: crypto.randomBytes(16).toString('hex'),
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url'
  );
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  const sigBuf = Buffer.from(sigB64, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    ) as SessionPayload;
    if (payload.sub !== 'admin' || typeof payload.exp !== 'number') return null;
    if (Date.now() > payload.exp) return null;
    if (revokedTokens.has(payload.jti)) return null;
    return payload;
  } catch {
    return null;
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

function getClientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(req: Request): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const key = getClientKey(req);
  const rec = loginAttempts.get(key);
  if (!rec || now > rec.resetAt) {
    return { allowed: true };
  }
  if (rec.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((rec.resetAt - now) / 1000),
    };
  }
  return { allowed: true };
}

function recordFailedAttempt(req: Request): void {
  const now = Date.now();
  const key = getClientKey(req);
  const rec = loginAttempts.get(key);
  if (!rec || now > rec.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    rec.count += 1;
  }
}

function clearAttempts(req: Request): void {
  loginAttempts.delete(getClientKey(req));
}

function pruneRevokedTokens(): void {
  const now = Date.now();
  for (const [jti, exp] of revokedTokens.entries()) {
    if (now > exp) revokedTokens.delete(jti);
  }
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  // Auth Status Endpoint
  app.get('/api/auth/status', (req: Request, res: Response) => {
    pruneRevokedTokens();
    const envPasscode = getEnvPasscode();
    const mode = envPasscode
      ? 'env'
      : claimedAdminCredential
        ? 'claimed'
        : 'setup_required';

    const token = extractBearerToken(req);
    const session = token ? verifySessionToken(token) : null;

    res.json({
      configured: mode !== 'setup_required',
      mode,
      authenticated: Boolean(session),
    });
  });

  // One-Time First-Run Admin Passcode Setup Endpoint
  app.post('/api/auth/setup', (req: Request, res: Response) => {
    if (getEnvPasscode() || claimedAdminCredential || setupClaimLock) {
      res.status(409).json({
        error:
          'Kata laluan pentadbir telah ditetapkan. Sila gunakan borang log masuk.',
      });
      return;
    }

    const password =
      typeof req.body?.password === 'string' ? req.body.password : '';
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({
        error: 'Kata laluan mestilah antara 8 hingga 128 aksara.',
      });
      return;
    }

    setupClaimLock = true;
    try {
      const salt = crypto.randomBytes(16).toString('hex');
      const derived = hashPasswordScrypt(password, salt);
      claimedAdminCredential = {
        salt,
        hashHex: derived.toString('hex'),
        claimedAt: new Date().toISOString(),
      };
      const token = signSessionToken();
      res.status(201).json({
        authenticated: true,
        token,
        expiresInMs: SESSION_TTL_MS,
      });
    } finally {
      setupClaimLock = false;
    }
  });

  // Login Endpoint
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const limit = checkRateLimit(req);
    if (!limit.allowed) {
      res.status(429).json({
        error: `Terlalu banyak percubaan log masuk. Sila cuba lagi dalam ${Math.ceil(
          (limit.retryAfterSec || 60) / 60
        )} minit.`,
      });
      return;
    }

    if (!getEnvPasscode() && !claimedAdminCredential) {
      res.status(400).json({
        error:
          'Kata laluan pentadbir belum ditetapkan. Sila lengkapkan tetapan awal terlebih dahulu.',
      });
      return;
    }

    const password =
      typeof req.body?.password === 'string' ? req.body.password : '';
    if (!password || password.length > 128) {
      recordFailedAttempt(req);
      res.status(401).json({ error: 'Kata laluan tidak sah.' });
      return;
    }

    if (!verifyPasswordAgainstServer(password)) {
      recordFailedAttempt(req);
      res.status(401).json({ error: 'Kata laluan yang dimasukkan tidak tepat.' });
      return;
    }

    clearAttempts(req);
    const token = signSessionToken();
    res.json({
      authenticated: true,
      token,
      expiresInMs: SESSION_TTL_MS,
    });
  });

  // Logout Endpoint
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    const session = token ? verifySessionToken(token) : null;
    if (session) {
      revokedTokens.set(session.jti, session.exp);
    }
    res.json({ authenticated: false });
  });

  // Verify Session Endpoint
  app.get('/api/auth/me', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    const session = token ? verifySessionToken(token) : null;
    if (!session) {
      res.status(401).json({ authenticated: false });
      return;
    }
    res.json({
      authenticated: true,
      role: 'admin',
      expiresAt: session.exp,
    });
  });

  // Vite middleware in development, static dist serving in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sistem Kewangan Masjid Muhsinin berjalan pada port ${PORT}`);
  });
}

startServer();
