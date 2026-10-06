// Membuat database, tabel, dan data awal. Jalankan: node scripts/setup-db.js
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

function loadEnv() {
  const file = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

const DB = process.env.DB_NAME || 'kasir_db';

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    role ENUM('admin','petugas') NOT NULL DEFAULT 'petugas',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode VARCHAR(50) NOT NULL UNIQUE,
    nama VARCHAR(150) NOT NULL,
    kategori VARCHAR(80) NOT NULL DEFAULT '',
    harga INT NOT NULL DEFAULT 0,
    stok INT NOT NULL DEFAULT 0,
    gambar MEDIUMTEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_member VARCHAR(20) NOT NULL UNIQUE,
    nama VARCHAR(100) NOT NULL,
    telp VARCHAR(20) NOT NULL,
    email VARCHAR(120) NOT NULL DEFAULT '',
    alamat VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tanggal DATETIME NOT NULL,
    user_id INT NULL,
    kasir VARCHAR(100) NOT NULL,
    member_id INT NULL,
    member_nama VARCHAR(150) NOT NULL DEFAULT '-',
    metode ENUM('Tunai','QRIS') NOT NULL DEFAULT 'Tunai',
    subtotal INT NOT NULL,
    diskon_persen INT NOT NULL DEFAULT 0,
    diskon INT NOT NULL DEFAULT 0,
    total INT NOT NULL,
    bayar INT NOT NULL,
    kembali INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_trx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_trx_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS transaction_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    product_id INT NULL,
    nama VARCHAR(150) NOT NULL,
    harga INT NOT NULL,
    qty INT NOT NULL,
    CONSTRAINT fk_item_trx FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,
];

const PRODUCTS = [
  ['8991001', 'Kopi Susu Botol', 'Minuman', 12000, 40, '/produk/kopi.jpg'],
  ['8991002', 'Teh Manis Dingin', 'Minuman', 6000, 60, '/produk/teh.jpg'],
  ['8991003', 'Air Mineral 600ml', 'Minuman', 4000, 100, '/produk/air.jpg'],
  ['8992001', 'Roti Cokelat', 'Makanan', 8500, 25, '/produk/roti.jpg'],
  ['8992002', 'Mie Instan Goreng', 'Makanan', 3500, 80, '/produk/mie.jpg'],
  ['8992003', 'Keripik Singkong', 'Snack', 9000, 20, '/produk/keripik.jpg'],
  ['8993001', 'Sabun Cuci Tangan', 'Rumah Tangga', 15000, 18, '/produk/sabun.jpg'],
  ['8993002', 'Tisu Gulung', 'Rumah Tangga', 11000, 30, '/produk/tisu.jpg'],
];

const MEMBERS = [
  ['MBR001', 'Budi Santoso', '081234567890', 'budi@mail.com', 'Jl. Merdeka No. 10, Bekasi'],
  ['MBR002', 'Siti Aminah', '081298765432', 'siti@mail.com', 'Jl. Melati No. 5, Jakarta'],
];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${DB}\``);
  for (const sql of TABLES) await conn.query(sql);
  console.log(`Database "${DB}" dan semua tabel siap.`);

  const [[u]] = await conn.query('SELECT COUNT(*) AS n FROM users');
  if (u.n === 0) {
    await conn.query('INSERT INTO users (nama, username, password_hash, role) VALUES ?', [[
      ['Administrator', 'admin', bcrypt.hashSync('admin123', 10), 'admin'],
      ['Petugas Kasir', 'petugas', bcrypt.hashSync('petugas123', 10), 'petugas'],
    ]]);
    console.log('Akun awal dibuat: admin / admin123 dan petugas / petugas123 (segera ganti passwordnya).');
  }

  const [[p]] = await conn.query('SELECT COUNT(*) AS n FROM products');
  if (p.n === 0) {
    await conn.query('INSERT INTO products (kode, nama, kategori, harga, stok, gambar) VALUES ?', [PRODUCTS]);
    console.log('Data barang contoh ditambahkan.');
  }

  const [[m]] = await conn.query('SELECT COUNT(*) AS n FROM members');
  if (m.n === 0) {
    await conn.query('INSERT INTO members (id_member, nama, telp, email, alamat) VALUES ?', [MEMBERS]);
    console.log('Data member contoh ditambahkan.');
  }

  await conn.end();
  console.log('Selesai. Sekarang jalankan: npm run dev');
}

main().catch((e) => {
  console.error('\nGagal menyiapkan database:', e.code || '', e.message);
  if (e.code === 'ECONNREFUSED') console.error('MySQL belum jalan. Buka Laragon lalu klik "Start All".');
  if (e.code === 'ER_ACCESS_DENIED_ERROR') console.error('Username/password MySQL salah. Periksa DB_USER dan DB_PASSWORD di .env.local.');
  process.exit(1);
});