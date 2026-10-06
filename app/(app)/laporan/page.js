'use client';
import { useState } from 'react';
import { api, useApi, rp, tgl } from '@/lib/store';
import { useSession } from '@/lib/session';

// tanggal lokal (YYYY-MM-DD) dari waktu transaksi
const tglLokal = (iso) => new Date(iso).toLocaleDateString('en-CA');

export default function Laporan() {
  const [txs, reload, error] = useApi('/api/transactions');
  const session = useSession();
  const admin = session?.role === 'admin';
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState('');

  if (!txs) return error ? <p className="err">{error}</p> : null;

  const rows = txs.filter((t) => {
    const d = tglLokal(t.tanggal);
    return (!dari || d >= dari) && (!sampai || d <= sampai);
  });
  const omzet = rows.reduce((a, t) => a + t.total, 0);
  const item = rows.reduce((a, t) => a + t.items.reduce((b, i) => b + i.qty, 0), 0);
  const data = rows.map((t) => [
    t.kode, tgl(t.tanggal), t.kasir, t.member, t.metode || 'Tunai',
    t.items.map((i) => `${i.nama} x${i.qty}`).join(', '), t.total,
  ]);
  const head = ['Kode', 'Tanggal', 'Kasir', 'Member', 'Metode', 'Barang', 'Total'];

  const reset = async () => {
    if (!confirm('Reset riwayat laporan? Semua transaksi akan dihapus dan tidak bisa dikembalikan.')) return;
    try {
      await api('/api/transactions', { method: 'DELETE' });
      setDari('');
      setSampai('');
      await reload();
    } catch (e) {
      alert(e.message);
    }
  };

  const pdf = async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14); doc.text('Laporan Penjualan', 14, 15);
    doc.setFontSize(10); doc.text(`Periode: ${dari || 'awal'} s/d ${sampai || 'sekarang'}  |  Omzet: ${rp(omzet)}`, 14, 22);
    autoTable(doc, { head: [head], body: data.map((r) => [...r.slice(0, 6), rp(r[6])]), startY: 27, headStyles: { fillColor: [14, 124, 102] } });
    doc.save('laporan-penjualan.pdf');
  };
  const xlsx = async () => {
    const X = await import('xlsx');
    const ws = X.utils.aoa_to_sheet([head, ...data]);
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, 'Penjualan');
    X.writeFile(wb, 'laporan-penjualan.xlsx');
  };

  return (
    <>
      <header className="head">
        <h1>Laporan</h1>
        <div className="tools">
          <input type="date" value={dari} onChange={(e) => setDari(e.target.value)} aria-label="Dari tanggal" />
          <input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} aria-label="Sampai tanggal" />
          <button className="btn" disabled={!rows.length} onClick={pdf}>Unduh PDF</button>
          <button className="btn primary" disabled={!rows.length} onClick={xlsx}>Unduh Excel</button>
          {admin && <button className="btn danger" disabled={!txs.length} onClick={reset}>Reset riwayat</button>}
        </div>
      </header>
      <div className="stats">
        <div className="card pad"><small>Omzet</small><b>{rp(omzet)}</b></div>
        <div className="card pad"><small>Transaksi</small><b>{rows.length}</b></div>
        <div className="card pad"><small>Barang terjual</small><b>{item}</b></div>
      </div>
      <div className="card tablewrap">
        <table>
          <thead><tr>{head.map((h, i) => <th key={h} className={i === 6 ? 'r' : ''}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((t, idx) => (
              <tr key={t.id}>
                {data[idx].map((c, i) => (
                  <td key={i} className={i === 6 ? 'r' : ''}>
                    {i === 6 ? <b>{rp(c)}</b> : i === 4 ? <span className="badge">{c}</span> : c}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="7" className="empty">Belum ada transaksi pada periode ini.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}