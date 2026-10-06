'use client';
import { useMemo, useRef, useState, useEffect } from 'react';
import { api, useApi, rp } from '@/lib/store';
import { DISKON_MEMBER } from '@/lib/config';
import Thumb from '@/components/Thumb';

// Ganti data toko di sini, akan tampil di struk
const TOKO = {
  nama: 'KOLOT',
  alamat: 'Jl. Juajanda No. 142, Kota Atlantis',
  telp: '0812-3456-7890',
};

const num = (n) => Number(n || 0).toLocaleString('id-ID');
const fTanggal = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fJam = (iso) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');

export default function Kasir() {
  const [products, reloadProducts, errProducts] = useApi('/api/products');
  const [members, , errMembers] = useApi('/api/members');
  const [cart, setCart] = useState([]);
  const [q, setQ] = useState('');
  const [kat, setKat] = useState('Semua');
  const [member, setMember] = useState('');
  const [metode, setMetode] = useState('tunai');
  const [bayar, setBayar] = useState('');
  const [qrisOpen, setQrisOpen] = useState(false);
  const [qrisRusak, setQrisRusak] = useState(false);
  const [struk, setStruk] = useState(null);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const scan = useRef(null);
  useEffect(() => { scan.current?.focus(); }, [struk]);

  const cats = useMemo(() => ['Semua', ...new Set((products || []).map((p) => p.kategori))], [products]);
  const list = (products || []).filter((p) => (kat === 'Semua' || p.kategori === kat) && (p.nama + p.kode).toLowerCase().includes(q.toLowerCase()));

  const selMember = (members || []).find((x) => String(x.id) === member);
  const subtotal = cart.reduce((a, c) => a + c.harga * c.qty, 0);
  const diskon = selMember ? Math.round((subtotal * DISKON_MEMBER) / 100) : 0;
  const total = subtotal - diskon;
  const kembali = Number(bayar || 0) - total;
  const isQris = metode === 'qris';

  const add = (p) => {
    setMsg('');
    const ex = cart.find((c) => c.id === p.id);
    if ((ex?.qty || 0) + 1 > p.stok) return setMsg(`Stok ${p.nama} hanya ${p.stok}.`);
    setCart(ex
      ? cart.map((c) => (c.id === p.id ? { ...c, qty: c.qty + 1 } : c))
      : [...cart, { id: p.id, nama: p.nama, harga: p.harga, gambar: p.gambar, kategori: p.kategori, qty: 1 }]);
  };
  const setQty = (id, qty) => {
    const p = products.find((x) => x.id === id);
    if (qty > p.stok) return setMsg(`Stok ${p.nama} hanya ${p.stok}.`);
    setCart(qty < 1 ? cart.filter((c) => c.id !== id) : cart.map((c) => (c.id === id ? { ...c, qty } : c)));
  };
  const onScan = (e) => {
    if (e.key !== 'Enter') return;
    const p = products.find((x) => x.kode === q.trim());
    if (p) { add(p); setQ(''); } else if (q) setMsg('Kode barang tidak ditemukan.');
  };

  const selesaikan = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const t = await api('/api/transactions', {
        method: 'POST',
        body: {
          items: cart.map(({ id, qty }) => ({ id, qty })),
          memberId: member || null,
          metode: isQris ? 'QRIS' : 'Tunai',
          bayar: isQris ? total : Number(bayar),
        },
      });
      setStruk(t);
      setCart([]); setBayar(''); setMember(''); setQ(''); setMsg('');
      setQrisOpen(false); setQrisRusak(false);
      reloadProducts();
    } catch (e) {
      setQrisOpen(false);
      setMsg(e.message);
      reloadProducts();
    } finally {
      setSaving(false);
    }
  };

  const pay = () => {
    if (!cart.length) return setMsg('Keranjang masih kosong.');
    if (isQris) { setMsg(''); return setQrisOpen(true); }
    if (kembali < 0) return setMsg('Uang bayar kurang dari total.');
    selesaikan();
  };

  if (!products || !members) {
    const e = errProducts || errMembers;
    return e ? <p className="err">{e}</p> : null;
  }
  const totalItem = struk ? struk.items.reduce((a, i) => a + i.qty, 0) : 0;

  return (
    <>
      <div className="pos">
        <section>
          <h1>Kasir</h1>
          <input ref={scan} className="search" placeholder="Cari nama barang" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onScan} />
          <div className="chips">{cats.map((c) => <button key={c} className={'chip' + (kat === c ? ' on' : '')} onClick={() => setKat(c)}>{c}</button>)}</div>
          <div className="grid">
            {list.map((p) => (
              <button key={p.id} className="prod" disabled={p.stok < 1} onClick={() => add(p)}>
                <Thumb p={p} className="cover" />
                <div className="pbody">
                  <span className="pk">{p.kategori}</span>
                  <b>{p.nama}</b>
                  <span className="pp">{rp(p.harga)}</span>
                  <span className={'ps' + (p.stok <= 5 ? ' low' : '')}>{p.stok < 1 ? 'Stok habis' : `Stok ${p.stok}`}</span>
                </div>
              </button>
            ))}
            {!list.length && <p className="empty">Tidak ada barang yang cocok.</p>}
          </div>
        </section>
        <aside className="cart">
          <h2>Pesanan</h2>
          <div className="lines">
            {cart.map((c) => (
              <div key={c.id} className="line">
                <Thumb p={c} className="mini" />
                <div><b>{c.nama}</b><small>{rp(c.harga)}</small></div>
                <div className="qty">
                  <button onClick={() => setQty(c.id, c.qty - 1)}>−</button><span>{c.qty}</span><button onClick={() => setQty(c.id, c.qty + 1)}>+</button>
                </div>
                <b>{rp(c.harga * c.qty)}</b>
              </div>
            ))}
            {!cart.length && <p className="empty">Scan atau pilih barang untuk memulai pesanan.</p>}
          </div>
          <label>Member
            <select value={member} onChange={(e) => setMember(e.target.value)}>
              <option value="">Bukan member</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.idMember} – {m.nama} ({m.telp})</option>)}
            </select>
          </label>
          {!selMember && DISKON_MEMBER > 0 && <p className="mut" style={{ margin: '-4px 0 12px' }}>Pilih member untuk diskon {DISKON_MEMBER}%.</p>}

          {selMember && (
            <>
              <div className="total sm" style={{ margin: '0 0 4px' }}><span>Subtotal</span><b>{rp(subtotal)}</b></div>
              <div className="total sm" style={{ margin: '0 0 8px' }}><span>Diskon member {DISKON_MEMBER}%</span><b style={{ color: 'var(--ac2)' }}>-{rp(diskon)}</b></div>
            </>
          )}
          <div className="total"><span>Total</span><b>{rp(total)}</b></div>

          <div style={{ fontSize: 13, color: 'var(--mut)', marginBottom: 6 }}>Metode bayar</div>
          <div className="chips" style={{ marginTop: 0 }}>
            <button className={'chip' + (!isQris ? ' on' : '')} onClick={() => setMetode('tunai')}>Tunai</button>
            <button className={'chip' + (isQris ? ' on' : '')} onClick={() => setMetode('qris')}>QRIS</button>
          </div>

          {!isQris && (
            <>
              <label>Uang bayar<input type="number" value={bayar} onChange={(e) => setBayar(e.target.value)} placeholder="0" /></label>
              <div className="quick">{[total, 50000, 100000].map((v, i) => v > 0 && <button key={i} className="chip" onClick={() => setBayar(String(v))}>{i === 0 ? 'Uang pas' : rp(v)}</button>)}</div>
              <div className="total sm"><span>Kembalian</span><b className={kembali < 0 ? 'neg' : ''}>{bayar ? rp(kembali) : '-'}</b></div>
            </>
          )}
          {isQris && <p className="mut" style={{ margin: '0 0 14px' }}>Pelanggan membayar pas sesuai total lewat scan QRIS.</p>}

          {msg && <p className="err">{msg}</p>}
          <button className="btn primary lg" onClick={pay} disabled={saving}>{saving ? 'Menyimpan...' : isQris ? 'Tampilkan QRIS' : 'Bayar'}</button>
        </aside>
      </div>

      {qrisOpen && (
        <div className="modal" onClick={() => setQrisOpen(false)}>
          <div className="struk" style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h3>Bayar dengan QRIS</h3>
            <p className="mut" style={{ margin: '0 0 8px' }}>Minta pelanggan scan kode di bawah, lalu masukkan nominal ini:</p>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.02em', margin: '4px 0 14px' }}>{rp(total)}</div>
            {!qrisRusak ? (
              <img src="/qris.png" alt="Kode QRIS toko" onError={() => setQrisRusak(true)}
                style={{ width: '100%', maxWidth: 280, borderRadius: 12, border: '1px solid var(--line)' }} />
            ) : (
              <div className="empty" style={{ border: '1px dashed var(--line)', borderRadius: 12 }}>
                Gambar QRIS belum ada. Simpan file <b>qris.png</b> di folder <b>public</b> project.
              </div>
            )}
            <p className="mut" style={{ margin: '12px 0 0' }}>Tekan tombol di bawah hanya setelah uang masuk di notifikasi bank atau e-wallet.</p>
            <div className="acts" style={{ justifyContent: 'center' }}>
              <button className="btn" onClick={() => setQrisOpen(false)}>Batal</button>
              <button className="btn primary" onClick={selesaikan} disabled={saving}>{saving ? 'Menyimpan...' : 'Pembayaran diterima'}</button>
            </div>
          </div>
        </div>
      )}

      {struk && (
        <div className="modal" onClick={() => setStruk(null)}>
          <div className="nota-wrap" onClick={(e) => e.stopPropagation()}>
            <div className="nota">
              <div className="n-center n-toko">{TOKO.nama}</div>
              <div className="n-center n-small">{TOKO.alamat}</div>
              <div className="n-center n-small">Telp. {TOKO.telp}</div>

              <div className="n-line" />
              <div className="n-row n-small"><span>{fTanggal(struk.tanggal)} {fJam(struk.tanggal)}</span><span>{struk.kode}</span></div>
              <div className="n-row n-small"><span>Kasir</span><span>{struk.kasir}</span></div>
              {struk.member && struk.member !== '-' && <div className="n-row n-small"><span>Member</span><span>{struk.member}</span></div>}
              <div className="n-line" />

              {struk.items.map((i) => (
                <div key={i.id} className="n-item">
                  <div className="n-name">{i.nama}</div>
                  <div className="n-row"><span>{i.qty} x {num(i.harga)}</span><span>{num(i.harga * i.qty)}</span></div>
                </div>
              ))}

              <div className="n-line" />
              <div className="n-row"><span>Total Item</span><span>{totalItem}</span></div>
              {struk.diskon > 0 && (
                <>
                  <div className="n-row"><span>Subtotal</span><span>{num(struk.subtotal)}</span></div>
                  <div className="n-row"><span>Diskon Member {struk.diskonPersen}%</span><span>-{num(struk.diskon)}</span></div>
                </>
              )}
              <div className="n-row n-total"><span>TOTAL</span><span>{num(struk.total)}</span></div>
              <div className="n-row"><span>{(struk.metode || 'Tunai').toUpperCase()}</span><span>{num(struk.bayar)}</span></div>
              <div className="n-row"><span>Kembali</span><span>{num(struk.kembali)}</span></div>
              {struk.diskon > 0 && <div className="n-center n-small" style={{ marginTop: 6 }}>Anda hemat Rp {num(struk.diskon)}</div>}
              <div className="n-line" />

              <div className="n-center n-bold">TERIMA KASIH</div>
              <div className="n-center n-small">Selamat berbelanja kembali</div>
              <div className="n-center n-small">Barang yang sudah dibeli tidak dapat</div>
              <div className="n-center n-small">ditukar atau dikembalikan</div>

              <div className="n-barcode" aria-hidden />
              <div className="n-center n-small n-kode">{struk.kode}</div>
            </div>

            <div className="nota-acts">
              <button className="btn" onClick={() => window.print()}>Cetak struk</button>
              <button className="btn primary" onClick={() => setStruk(null)}>Transaksi baru</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}