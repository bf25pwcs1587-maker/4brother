import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { db, hashPassword } from './db.ts';

export interface AuthenticatedUser {
  id: string;
  email: string;
  full_name: string;
  brother_key: string;
  avatar_color: string;
  avatar_url?: string | null;
  phone_number?: string | null;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function createSession(userId: string): { token: string; expiresAt: string } {
  const token = crypto.randomBytes(32).toString('hex');
  // 30 days session
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO sessions (token, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(token, userId, expiresAt, createdAt);

  return { token, expiresAt };
}

export function deleteSession(token: string) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function getSessionUser(token: string): AuthenticatedUser | null {
  if (!token) return null;

  // 1. Direct session check
  const session = db.prepare(`
    SELECT s.user_id, s.expires_at, u.id, u.email, u.full_name, u.brother_key, u.avatar_color, u.avatar_url, u.phone_number, u.role
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ?
  `).get(token) as (AuthenticatedUser & { expires_at: string; user_id: string }) | undefined;

  if (session) {
    if (new Date(session.expires_at).getTime() < Date.now()) {
      deleteSession(token);
      return null;
    }
    return {
      id: session.id,
      email: session.email,
      full_name: session.full_name,
      brother_key: session.brother_key,
      avatar_color: session.avatar_color,
      avatar_url: session.avatar_url || null,
      phone_number: session.phone_number || null,
      role: session.role
    };
  }

  // 2. Recovery for local_session_<brotherKey>_<timestamp>
  if (token.startsWith('local_session_')) {
    const parts = token.split('_');
    const brotherKey = parts[2];
    if (brotherKey) {
      const u = db.prepare(`
        SELECT id, email, full_name, brother_key, avatar_color, avatar_url, phone_number, role
        FROM users WHERE LOWER(brother_key) = ?
      `).get(brotherKey.toLowerCase()) as AuthenticatedUser | undefined;

      if (u) {
        try {
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          const createdAt = new Date().toISOString();
          db.prepare('INSERT OR REPLACE INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(token, u.id, expiresAt, createdAt);
        } catch {}
        return u;
      }
    }
  }

  // 3. Fallback recovery if token matches a brother_key directly
  const knownKeys = ['mahmood', 'azhar', 'talha', 'sabaz'];
  if (knownKeys.includes(token.toLowerCase())) {
    const u = db.prepare(`
      SELECT id, email, full_name, brother_key, avatar_color, avatar_url, phone_number, role
      FROM users WHERE LOWER(brother_key) = ?
    `).get(token.toLowerCase()) as AuthenticatedUser | undefined;

    if (u) {
      try {
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const createdAt = new Date().toISOString();
        db.prepare('INSERT OR REPLACE INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(token, u.id, expiresAt, createdAt);
      } catch {}
      return u;
    }
  }

  return null;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. Please sign in to access your brother profile.'
    });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  const user = getSessionUser(token);

  if (!user) {
    return res.status(401).json({
      error: 'Invalid or expired session. Please sign in again.'
    });
  }

  req.user = user;
  next();
}
