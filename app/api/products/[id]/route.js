import { pool } from '@/lib/db';
import { route, readBody, cleanProduct, ApiError } from '@/lib/server';

export const dynamic = 'force-dynamic';

export const PUT = route(async (req, { params }) => {
  const id = Number(params.id);
  const p = cleanProduct(await readBody(req));
  const [r] = await pool.query(
    'UPDATE products SET kode = ?, nama = ?, kategori = ?, harga = ?, stok = ?, gambar = ? WHERE id = ?',
    [p.kode, p.nama, p.kategori, p.harga, p.stok, p.gambar, id]
  );
  if (!r.affectedRows) throw new ApiError(404, 'Barang tidak ditemukan.');
  return { ok: true };
}, ['admin']);

export const DELETE = route(async (req, { params }) => {
  const [r] = await pool.query('DELETE FROM products WHERE id = ?', [Number(params.id)]);
  if (!r.affectedRows) throw new ApiError(404, 'Barang tidak ditemukan.');
  return { ok: true };
}, ['admin']);