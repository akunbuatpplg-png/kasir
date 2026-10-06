'use client';
import { useState } from 'react';
import { api, useApi } from '@/lib/store';
import { useSession } from '@/lib/session';

const empty = { idMember: '', nama: '', telp: '', email: '', alamat: '' };

export default function Member() {
  const [members, reload, error] = useApi('/api/members');
  const session = useSession();
  const admin = session?.role === 'admin';
  const [form, setForm] = useState(null);
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');

  if (!members) return error ? <p className="err">{error}</p> : null;

  const openForm = (m) => { setFormErr(''); setForm(m); };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormErr('');
    try {
      await api(form.id ? `/api/members/${form.id}` : '/api/members', {
        method: form.id ? 'PUT' : 'POST',
        body: form,
      });
      await reload();
      setForm(null);
    } catch (e2) {
      setFormErr(e2.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (m) => {
    if (!confirm(`Hapus member ${m.nama}?`)) return;
    try {
      await api(`/api/members/${m.id}`, { method: 'DELETE' });
      await reload();
    } catch (e2) {
      alert(e2.message);
    }
  };

  const rows = members.filter((m) => (m.idMember + m.nama + m.telp + m.email + m.alamat).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <header className="head">
        <h1>Member</h1>
        <div className="tools">
          <input className="search" placeholder="Cari member" value={q} onChange={(e) => setQ(e.target.value)} />
          {admin && <button className="btn primary" onClick={() => openForm(empty)}>Tambah member</button>}
        </div>
      </header>
      <div className="card tablewrap">
        <table>
          <thead>
            <tr><th>ID Member</th><th>Nama</th><th>No. Telepon</th><th>Email</th><th>Alamat</th>{admin && <th />}</tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td><span className="badge">{m.idMember}</span></td>
                <td><b>{m.nama}</b></td>
                <td>{m.telp}</td>
                <td>{m.email || '-'}</td>
                <td>{m.alamat || '-'}</td>
                {admin && (
                  <td className="r">
                    <button className="btn sm" onClick={() => openForm(m)}>Ubah</button>{' '}
                    <button className="btn sm danger" onClick={() => del(m)}>Hapus</button>
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={admin ? 6 : 5} className="empty">{admin ? 'Belum ada member. Klik Tambah member untuk mendaftarkan yang pertama.' : 'Belum ada member.'}</td></tr>}
          </tbody>
        </table>
      </div>
      {admin && form && (
        <div className="modal" onClick={() => setForm(null)}>
          <form className="struk" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <h3>{form.id ? 'Ubah member' : 'Tambah member'}</h3>
            <label>ID Member<input value={form.idMember} readOnly placeholder="Dibuat otomatis saat disimpan" /></label>
            <label>Nama<input required value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></label>
            <label>No. Telepon<input required type="tel" pattern="[0-9+]{8,15}" title="Isi 8-15 angka, boleh diawali +" value={form.telp} onChange={(e) => setForm({ ...form, telp: e.target.value })} /></label>
            <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label>Alamat<input value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} /></label>
            {formErr && <p className="err">{formErr}</p>}
            <div className="acts">
              <button type="button" className="btn" onClick={() => setForm(null)}>Batal</button>
              <button className="btn primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}