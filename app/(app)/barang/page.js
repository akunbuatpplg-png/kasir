'use client';
import { useState } from 'react';
import { api, useApi, rp, resizeImage } from '@/lib/store';
import { useSession } from '@/lib/session';
import Thumb from '@/components/Thumb';

const empty = { kode: '', nama: '', harga: '', stok: '', kategori: '', gambar: '' };

export default function Barang() {
  const [products, reload, error] = useApi('/api/products');
  const session = useSession();
  const admin = session?.role === 'admin';
  const [form, setForm] = useState(null);
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');

  if (!products) return error ? <p className="err">{error}</p> : null;

  const openForm = (p) => { setFormErr(''); setForm(p); };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormErr('');
    try {
      await api(form.id ? `/api/products/${form.id}` : '/api/products', {
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

  const del = async (p) => {
    if (!confirm(`Hapus ${p.nama}?`)) return;
    try {
      await api(`/api/products/${p.id}`, { method: 'DELETE' });
      await reload();
    } catch (e2) {
      alert(e2.message);
    }
  };

  const pickImage = async (e) => {
    const f = e.target.files[0];
    if (f) setForm({ ...form, gambar: await resizeImage(f) });
  };

  const rows = products.filter((p) => (p.nama + p.kode + p.kategori).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <header className="head">
        <h1>Data Barang</h1>
        <div className="tools">
          <input className="search" placeholder="Cari barang" value={q} onChange={(e) => setQ(e.target.value)} />
          {admin && <button className="btn primary" onClick={() => openForm(empty)}>Tambah barang</button>}
        </div>
      </header>
      <div className="card tablewrap">
        <table>
          <thead><tr><th /><th>Kode</th><th>Nama</th><th>Kategori</th><th className="r">Harga</th><th className="r">Stok</th>{admin && <th />}</tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td><Thumb p={p} className="mini" /></td>
                <td>{p.kode}</td><td><b>{p.nama}</b></td><td>{p.kategori}</td><td className="r">{rp(p.harga)}</td>
                <td className="r"><span className={'badge' + (p.stok <= 5 ? ' low' : '')}>{p.stok}</span></td>
                {admin && <td className="r"><button className="btn sm" onClick={() => openForm(p)}>Ubah / update stok</button> <button className="btn sm danger" onClick={() => del(p)}>Hapus</button></td>}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="7" className="empty">Belum ada barang.</td></tr>}
          </tbody>
        </table>
      </div>
      {admin && form && (
        <div className="modal" onClick={() => setForm(null)}>
          <form className="struk" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <h3>{form.id ? 'Ubah barang' : 'Tambah barang'}</h3>
            {[['kode', 'Kode / barcode'], ['nama', 'Nama barang'], ['kategori', 'Kategori'], ['harga', 'Harga', 'number'], ['stok', 'Stok', 'number']].map(([k, l, t]) => (
              <label key={k}>{l}<input required type={t || 'text'} min="0" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
            ))}
            <label>Gambar barang<input type="file" accept="image/*" onChange={pickImage} /></label>
            {form.gambar && (
              <div className="prev">
                <img src={form.gambar} alt="Pratinjau gambar" className="thumb mini" />
                <button type="button" className="btn sm" onClick={() => setForm({ ...form, gambar: '' })}>Hapus gambar</button>
              </div>
            )}
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