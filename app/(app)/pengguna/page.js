'use client';
import { useState } from 'react';
import { api, useApi } from '@/lib/store';
import { useSession } from '@/lib/session';

const kosong = { nama: '', username: '', password: '', role: 'petugas' };

export default function Pengguna() {
  const [users, reload, error] = useApi('/api/users');
  const me = useSession();
  const [f, setF] = useState(kosong);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  if (!users) return error ? <p className="err">{error}</p> : null;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      await api('/api/users', { method: 'POST', body: f });
      setF(kosong);
      await reload();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (u) => {
    if (!confirm(`Hapus ${u.nama}?`)) return;
    try {
      await api(`/api/users/${u.id}`, { method: 'DELETE' });
      await reload();
    } catch (e2) {
      alert(e2.message);
    }
  };

  return (
    <>
      <header className="head"><h1>Pengguna</h1></header>
      <div className="two">
        <form className="card pad" onSubmit={submit}>
          <h2>Registrasi pengguna</h2>
          <label>Nama lengkap<input required value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} /></label>
          <label>Username<input required value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></label>
          <label>Password<input required type="password" minLength="6" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
          <label>Peran<select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="petugas">Petugas</option><option value="admin">Admin</option></select></label>
          {err && <p className="err">{err}</p>}
          <button className="btn primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Daftarkan'}</button>
        </form>
        <div className="card tablewrap">
          <table>
            <thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th /></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}><td><b>{u.nama}</b></td><td>{u.username}</td><td>{u.role === 'admin' ? 'Admin' : 'Petugas'}</td>
                  <td className="r">{u.id !== me?.id && <button className="btn sm danger" onClick={() => del(u)}>Hapus</button>}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}