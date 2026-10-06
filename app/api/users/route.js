import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { route, readBody, ApiError } from '@/lib/server';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const [rows] = await pool.query('SELECT id, nama, username, role FROM users ORDER BY id');
  return rows;
}, ['admin']);

export const POST = route(async (req) => {
  const b = await readBody(req);
  const nama = String(b?.nama ?? '').trim();
  const username = String(b?.username ?? '').trim();
  const password = String(b?.password ?? '');
  const role = b?.role === 'admin' ? 'admin' : 'petugas';
  if (!nama) throw new ApiError(400, 'Nama lengkap wajib diisi.');
  if (!username) throw new ApiError(400, 'Username wajib diisi.');
  if (password.length < 6) throw new ApiError(400, 'Password minimal 6 karakter.');
  const hash = await bcrypt.hash(password, 10);
  const [r] = await pool.query(
    'INSERT INTO users (nama, username, password_hash, role) VALUES (?, ?, ?, ?)',
    [nama, username, hash, role]
  );
  return { id: r.insertId, nama, username, role };
}, ['admin']);