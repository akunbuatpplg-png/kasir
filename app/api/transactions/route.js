import { pool } from '@/lib/db';
import { route, readBody, ApiError } from '@/lib/server';
import { DISKON_MEMBER } from '@/lib/config';

export const dynamic = 'force-dynamic';

const shape = (t, items) => ({
  id: t.id,
  kode: 'TRX' + String(t.id).padStart(4, '0'),
  tanggal: new Date(t.tanggal).toISOString(),
  kasir: t.kasir,
  member: t.member_nama,
  metode: t.metode,
  items: items.map((i) => ({ id: i.id, nama: i.nama, harga: i.harga, qty: i.qty })),
  subtotal: t.subtotal,
  diskonPersen: t.diskon_persen,
  diskon: t.diskon,
  total: t.total,
  bayar: t.bayar,
  kembali: t.kembali,
});

export const GET = route(async () => {
  const [rows] = await pool.query('SELECT * FROM transactions ORDER BY id DESC LIMIT 5000');
  if (!rows.length) return [];
  const [items] = await pool.query(
    'SELECT * FROM transaction_items WHERE transaction_id IN (?) ORDER BY id',
    [rows.map((r) => r.id)]
  );
  const byTrx = new Map();
  for (const it of items) {
    if (!byTrx.has(it.transaction_id)) byTrx.set(it.transaction_id, []);
    byTrx.get(it.transaction_id).push(it);
  }
  return rows.map((t) => shape(t, byTrx.get(t.id) || []));
});

// Membuat transaksi baru. Harga, diskon, dan total dihitung di server dari data database.
export const POST = route(async (req, { user }) => {
  const b = await readBody(req);
  const metode = b?.metode === 'QRIS' ? 'QRIS' : 'Tunai';

  // gabungkan barang yang sama
  const qtyById = new Map();
  for (const it of Array.isArray(b?.items) ? b.items : []) {
    const id = Number(it?.id);
    const qty = Math.floor(Number(it?.qty));
    if (!id || !(qty > 0)) throw new ApiError(400, 'Data barang tidak valid.');
    qtyById.set(id, (qtyById.get(id) || 0) + qty);
  }
  if (!qtyById.size) throw new ApiError(400, 'Keranjang masih kosong.');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const ids = [...qtyById.keys()];
    const [prods] = await conn.query(
      'SELECT id, nama, harga, stok FROM products WHERE id IN (?) FOR UPDATE',
      [ids]
    );
    if (prods.length !== ids.length) throw new ApiError(400, 'Ada barang yang sudah tidak tersedia.');

    let subtotal = 0;
    const lines = prods.map((p) => {
      const qty = qtyById.get(p.id);
      if (p.stok < qty) throw new ApiError(400, `Stok ${p.nama} hanya ${p.stok}.`);
      subtotal += p.harga * qty;
      return { productId: p.id, nama: p.nama, harga: p.harga, qty };
    });

    let member = null;
    if (b?.memberId) {
      const [ms] = await conn.query('SELECT id, id_member, nama FROM members WHERE id = ?', [Number(b.memberId)]);
      if (!ms.length) throw new ApiError(400, 'Member tidak ditemukan.');
      member = ms[0];
    }

    const diskonPersen = member ? DISKON_MEMBER : 0;
    const diskon = Math.round((subtotal * diskonPersen) / 100);
    const total = subtotal - diskon;

    let bayar = total;
    let kembali = 0;
    if (metode === 'Tunai') {
      bayar = Math.floor(Number(b?.bayar));
      if (!Number.isFinite(bayar) || bayar < total) throw new ApiError(400, 'Uang bayar kurang dari total.');
      kembali = bayar - total;
    }

    const tanggal = new Date();
    const memberNama = member ? `${member.nama} (${member.id_member})` : '-';
    const [r] = await conn.query(
      `INSERT INTO transactions
        (tanggal, user_id, kasir, member_id, member_nama, metode, subtotal, diskon_persen, diskon, total, bayar, kembali)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tanggal, user.id, user.nama, member ? member.id : null, memberNama, metode,
       subtotal, diskonPersen, diskon, total, bayar, kembali]
    );

    await conn.query(
      'INSERT INTO transaction_items (transaction_id, product_id, nama, harga, qty) VALUES ?',
      [lines.map((l) => [r.insertId, l.productId, l.nama, l.harga, l.qty])]
    );
    for (const l of lines) {
      await conn.query('UPDATE products SET stok = stok - ? WHERE id = ?', [l.qty, l.productId]);
    }

    await conn.commit();

    const [trx] = await pool.query('SELECT * FROM transactions WHERE id = ?', [r.insertId]);
    const [items] = await pool.query('SELECT * FROM transaction_items WHERE transaction_id = ? ORDER BY id', [r.insertId]);
    return shape(trx[0], items);
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
  }
});

// Reset seluruh riwayat laporan (stok barang tidak ikut berubah)
export const DELETE = route(async () => {
  const conn = await pool.getConnection();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('TRUNCATE TABLE transaction_items');
    await conn.query('TRUNCATE TABLE transactions');
  } finally {
    await conn.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    conn.release();
  }
  return { ok: true };
}, ['admin']);