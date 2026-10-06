'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/store';

export default function Login() {
  const r = useRouter();
  const [f, setF] = useState({ username: '', password: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      const u = await api('/api/login', { method: 'POST', body: f });
      r.replace(u.role === 'admin' ? '/barang' : '/kasir');
    } catch (e2) {
      setErr(e2.message);
      setLoading(false);
    }
  };

  return (
    <main className="login">
      <section className="login-art">
        <h1>Kasir<br />Warung</h1>
        <p>Scan barang, hitung total, terima pembayaran. Selesai dalam hitungan detik.</p>
        <div className="receipt-art" aria-hidden>
          <div>Kopi Susu Botol <b>12.000</b></div>
          <div>Roti Cokelat <b>8.500</b></div>
          <div>Air Mineral 600ml <b>4.000</b></div>
          <hr /><div>Total <b>24.500</b></div>
        </div>
      </section>
      <form className="login-form" onSubmit={submit}>
        <h2>Masuk</h2>
        <label>Username<input autoFocus value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></label>
        <label>Password<input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        {err && <p className="err">{err}</p>}
        <button className="btn primary lg" disabled={loading}>{loading ? 'Memeriksa...' : 'Masuk'}</button>
      </form>
    </main>
  );
}