import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { setSessionCookie } from '@/lib/auth';
import { ApiError, handleError, readBody } from '@/lib/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const b = await readBody(req);
    const username = String(b?.username ?? '').trim();
    const password = String(b?.password ?? '');
    const [rows] = await pool.query(
      'SELECT id, nama, username, role, password_hash FROM users WHERE username = ?',
      [username]
    );
    const u = rows[0];
    const ok = u ? await bcrypt.compare(password, u.password_hash) : false;
    if (!ok) throw new ApiError(401, 'Username atau password salah. Coba lagi.');
    await setSessionCookie(u.id);
    return NextResponse.json({ id: u.id, nama: u.nama, username: u.username, role: u.role });
  } catch (e) {
    return handleError(e);
  }
}