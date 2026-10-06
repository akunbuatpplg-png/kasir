import { pool } from '@/lib/db';
import { route, readBody, cleanMember } from '@/lib/server';

export const dynamic = 'force-dynamic';

const COLS = 'id, id_member AS idMember, nama, telp, email, alamat';

export const GET = route(async () => {
  const [rows] = await pool.query(`SELECT ${COLS} FROM members ORDER BY id`);
  return rows;
});

export const POST = route(async (req) => {
  const m = cleanMember(await readBody(req));
  // ID member otomatis: MBR001, MBR002, ...
  const [[last]] = await pool.query(
    "SELECT COALESCE(MAX(CAST(SUBSTRING(id_member, 4) AS UNSIGNED)), 0) AS maks FROM members"
  );
  const idMember = 'MBR' + String(Number(last.maks) + 1).padStart(3, '0');
  const [r] = await pool.query(
    'INSERT INTO members (id_member, nama, telp, email, alamat) VALUES (?, ?, ?, ?, ?)',
    [idMember, m.nama, m.telp, m.email, m.alamat]
  );
  const [rows] = await pool.query(`SELECT ${COLS} FROM members WHERE id = ?`, [r.insertId]);
  return rows[0];
}, ['admin']);