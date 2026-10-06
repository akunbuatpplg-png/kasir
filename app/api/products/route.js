import { pool } from '@/lib/db';
import { route, readBody, cleanProduct } from '@/lib/server';

export const dynamic = 'force-dynamic';

const COLS = 'id, kode, nama, kategori, harga, stok, gambar';
const shape = (r) => ({ ...r, gambar: r.gambar || '' });

export const GET = route(async () => {
  const [rows] = await pool.query(`SELECT ${COLS} FROM products ORDER BY id`);
  return rows.map(shape);
});

export const POST = route(async (req) => {
  const p = cleanProduct(await readBody(req));
  const [r] = await pool.query(
    'INSERT INTO products (kode, nama, kategori, harga, stok, gambar) VALUES (?, ?, ?, ?, ?, ?)',
    [p.kode, p.nama, p.kategori, p.harga, p.stok, p.gambar]
  );
  const [rows] = await pool.query(`SELECT ${COLS} FROM products WHERE id = ?`, [r.insertId]);
  return shape(rows[0]);
}, ['admin']);