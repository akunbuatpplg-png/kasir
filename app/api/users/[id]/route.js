import { pool } from '@/lib/db';
import { route, ApiError } from '@/lib/server';

export const dynamic = 'force-dynamic';

export const DELETE = route(async (req, { user, params }) => {
  const id = Number(params.id);
  if (id === user.id) throw new ApiError(400, 'Akun yang sedang dipakai tidak bisa dihapus.');
  const [rows] = await pool.query('SELECT role FROM users WHERE id = ?', [id]);
  if (!rows.length) throw new ApiError(404, 'Pengguna tidak ditemukan.');
  if (rows[0].role === 'admin') {
    const [[c]] = await pool.query("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'");
    if (c.n <= 1) throw new ApiError(400, 'Admin terakhir tidak bisa dihapus.');
  }
  await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return { ok: true };
}, ['admin']);