'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/store';

export default function Home() {
  const r = useRouter();
  useEffect(() => {
    api('/api/me')
      .then((u) => r.replace(u.role === 'admin' ? '/barang' : '/kasir'))
      .catch(() => r.replace('/login'));
  }, [r]);
  return null;
}