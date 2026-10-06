'use client';
import { useEffect, useState, useCallback } from 'react';

// Memanggil API server. Melempar Error dengan pesan yang bisa langsung ditampilkan.
export async function api(path, options = {}) {
  const res = await fetch(path, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    if (res.status === 401 && path !== '/api/login' && typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    const err = new Error(data?.error || 'Permintaan gagal. Coba lagi.');
    err.status = res.status;
    throw err;
  }
  return data;
}

// Mengambil data dari API. Mengembalikan [data, muatUlang, pesanError]
export function useApi(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try {
      setData(await api(path));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [path]);
  useEffect(() => { reload(); }, [reload]);
  return [data, reload, error];
}

export const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
export const tgl = (iso) => new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

export const emojiKat = (k = '') => {
  const s = k.toLowerCase();
  return s.includes('minum') ? '🥤' : s.includes('makan') ? '🍞' : s.includes('snack') ? '🍿' : s.includes('rumah') ? '🧼' : '📦';
};

// kecilkan gambar ke maks 400px lalu jadikan data URL (JPEG)
export function resizeImage(file, max = 400) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = img.width * s; c.height = img.height * s;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = rej;
    img.src = url;
  });
}