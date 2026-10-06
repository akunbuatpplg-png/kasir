import mysql from 'mysql2/promise';

// Satu koneksi pool dipakai bersama (dicache supaya aman saat hot-reload di mode dev)
const g = globalThis;

export const pool =
  g._kasirPool ||
  (g._kasirPool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kasir_db',
    waitForConnections: true,
    connectionLimit: 10,
    timezone: 'Z',
  }));