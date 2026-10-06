'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/store';
import { SessionContext } from '@/lib/session';

const NAV = [
  { href: '/kasir', label: 'Kasir', roles: ['petugas'] },
  { href: '/barang', label: 'Data Barang', roles: ['admin', 'petugas'] },
  { href: '/member', label: 'Member', roles: ['admin', 'petugas'] },
  { href: '/pengguna', label: 'Pengguna', roles: ['admin'] },
  { href: '/laporan', label: 'Laporan', roles: ['admin', 'petugas'] },
];

export default function AppLayout({ children }) {
  const r = useRouter();
  const path = usePathname();
  const [s, setS] = useState(null);

  useEffect(() => {
    api('/api/me').then(setS).catch(() => r.replace('/login'));
  }, [r]);

  useEffect(() => {
    if (!s) return;
    const n = NAV.find((n) => path.startsWith(n.href));
    if (n && !n.roles.includes(s.role)) r.replace(s.role === 'admin' ? '/barang' : '/kasir');
  }, [s, path, r]);

  if (!s) return null;

  const logout = async () => {
    try { await api('/api/logout', { method: 'POST' }); } catch {}
    r.replace('/login');
  };

  return (
    <SessionContext.Provider value={s}>
      <div className="shell">
        <aside className="side">
          <div className="brand">Kasir Warung</div>
          <nav>
            {NAV.filter((n) => n.roles.includes(s.role)).map((n) => (
              <Link key={n.href} href={n.href} className={path.startsWith(n.href) ? 'on' : ''}>{n.label}</Link>
            ))}
          </nav>
          <div className="who">
            <b>{s.nama}</b><span>{s.role === 'admin' ? 'Admin' : 'Petugas'}</span>
            <button className="btn ghost" onClick={logout}>Keluar</button>
          </div>
        </aside>
        <main className="main">{children}</main>
      </div>
    </SessionContext.Provider>
  );
}