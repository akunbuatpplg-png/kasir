'use client';
import { useState } from 'react';
import { emojiKat } from '@/lib/store';

export default function Thumb({ p, className = '' }) {
  const [bad, setBad] = useState('');
  return p.gambar && bad !== p.gambar
    ? <img src={p.gambar} alt={p.nama} className={'thumb ' + className} onError={() => setBad(p.gambar)} />
    : <div className={'thumb ph ' + className} aria-hidden>{emojiKat(p.kategori)}</div>;
}