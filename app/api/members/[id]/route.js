import { pool } from '@/lib/db';
import { route, readBody, cleanMember, ApiError } from '@/lib/server';

export const dynamic = 'force-dynamic';

export const PUT = route(async (req, { params }) => {
  const m = cleanMember(await readBody(req));
  const [r] = await pool.query(
    'UPDATE members SET nama = ?, telp = ?, email = ?, alamat = ? WHERE id = ?',
    [m.nama, m.telp, m.email, m.alamat, Number(params.id)]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Member tidak ditemukan.');
  return { ok: true };
}, ['admin']);

export const DELETE = route(async (req, { params }) => {
  const [r] = await pool.query('DELETE FROM members WHERE id = ?', [Number(params.id)]);
  if (!r.affectedRows) throw new ApiError(404, 'Member tidak ditemukan.');
  return { ok: true };
}, ['admin']);