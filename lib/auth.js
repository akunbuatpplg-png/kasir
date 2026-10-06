import crypto from 'crypto';
import { cookies } from 'next/headers';
import { pool } from '@/lib/db';

const NAME = 'kasir_session';
const MAX_AGE = 60 * 60 * 12; // 12 jam

const secret = () => process.env.AUTH_SECRET || 'ganti-rahasia-ini-di-env-local';
const sign = (v) => crypto.createHmac('sha256', secret()).update(v).digest('base64url');

function makeToken(userId) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  return payload + '.' + sign(payload);
}

function readToken(token) {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return d.exp > Date.now() ? d : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId) {
  const store = await cookies();
  store.set(NAME, makeToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(NAME);
}

// Mengembalikan pengguna yang sedang login (dicek ulang ke database), atau null
export async function getUser() {
  const store = await cookies();
  const data = readToken(store.get(NAME)?.value);
  if (!data) return null;
  const [rows] = await pool.query('SELECT id, nama, username, role FROM users WHERE id = ?', [data.uid]);
  return rows[0] || null;
}