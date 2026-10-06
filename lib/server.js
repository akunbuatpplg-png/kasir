import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Mengubah error menjadi pesan yang mudah dimengerti
export function handleError(e) {
  if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  const code = e?.code;
  const sql = String(e?.sqlMessage || '');
  let status = 500;
  let error = 'Terjadi kesalahan di server. Lihat terminal untuk detailnya.';
  if (['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'PROTOCOL_CONNECTION_LOST'].includes(code)) {
    error = 'Database tidak bisa dihubungi. Pastikan MySQL di Laragon sudah dijalankan (klik Start All).';
  } else if (code === 'ER_BAD_DB_ERROR' || code === 'ER_NO_SUCH_TABLE') {
    error = 'Database atau tabel belum dibuat. Jalankan di terminal: node scripts/setup-db.js';
  } else if (code === 'ER_ACCESS_DENIED_ERROR') {
    error = 'Username atau password MySQL salah. Periksa file .env.local.';
  } else if (code === 'ER_DUP_ENTRY') {
    const key = (sql.match(/for key '([^']+)'/) || [])[1] || '';
    status = 409;
    error = key.includes('username') ? 'Username sudah dipakai.'
      : key.includes('id_member') ? 'ID member sudah dipakai.'
      : key.includes('kode') ? 'Kode barang sudah dipakai.'
      : 'Data sudah ada.';
  }
  return NextResponse.json({ error }, { status });
}

// Pembungkus route: cek login, cek peran, tangkap error
export function route(handler, roles) {
  return async (req, ctx) => {
    try {
      const user = await getUser();
      if (!user) throw new ApiError(401, 'Sesi berakhir. Silakan masuk lagi.');
      if (roles && !roles.includes(user.role)) throw new ApiError(403, 'Anda tidak punya akses untuk aksi ini.');
      const params = ctx?.params ? await ctx.params : {};
      const data = await handler(req, { user, params });
      return NextResponse.json(data ?? { ok: true });
    } catch (e) {
      return handleError(e);
    }
  };
}

export async function readBody(req) {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, 'Data yang dikirim tidak valid.');
  }
}

export function cleanProduct(b) {
  const kode = String(b?.kode ?? '').trim();
  const nama = String(b?.nama ?? '').trim();
  const kategori = String(b?.kategori ?? '').trim();
  const harga = Math.floor(Number(b?.harga));
  const stok = Math.floor(Number(b?.stok));
  if (!kode) throw new ApiError(400, 'Kode barang wajib diisi.');
  if (!nama) throw new ApiError(400, 'Nama barang wajib diisi.');
  if (!Number.isFinite(harga) || harga < 0) throw new ApiError(400, 'Harga tidak valid.');
  if (!Number.isFinite(stok) || stok < 0) throw new ApiError(400, 'Stok tidak valid.');
  const gambar = b?.gambar ? String(b.gambar) : null;
  if (gambar && gambar.length > 3_000_000) throw new ApiError(400, 'Ukuran gambar terlalu besar.');
  return { kode, nama, kategori, harga, stok, gambar };
}

export function cleanMember(b) {
  const nama = String(b?.nama ?? '').trim();
  const telp = String(b?.telp ?? '').trim();
  const email = String(b?.email ?? '').trim();
  const alamat = String(b?.alamat ?? '').trim();
  if (!nama) throw new ApiError(400, 'Nama member wajib diisi.');
  if (!/^[0-9+]{8,15}$/.test(telp)) throw new ApiError(400, 'No. telepon harus 8-15 angka.');
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'Format email tidak valid.');
  return { nama, telp, email, alamat };
}