/**
 * One-shot database setup.
 *
 *   1. copy .env.example to .env and fill in PGPASSWORD
 *   2. node setup-db.js
 *
 * Creates the target database if it does not exist, then runs DDL.sql
 * followed by data.sql. Safe to re-run; DDL.sql drops and recreates.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const cfg = {
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
};
const dbName = process.env.PGDATABASE || 'amazon_clone';

function fail(msg, hint) {
  console.error(`\n  ✗ ${msg}`);
  if (hint) console.error(`    ${hint}`);
  process.exit(1);
}

(async () => {
  if (!cfg.password) {
    fail('PGPASSWORD is not set.', 'Copy .env.example to .env and add your postgres password.');
  }

  console.log(`\n  Connecting to ${cfg.user}@${cfg.host}:${cfg.port} …`);

  // 1. Connect to the maintenance database to create ours.
  const admin = new Client({ ...cfg, database: 'postgres' });
  try {
    await admin.connect();
  } catch (err) {
    if (err.code === '28P01') fail('Password authentication failed.', 'Check PGPASSWORD in .env.');
    if (err.code === 'ECONNREFUSED') fail(`Nothing accepting connections on ${cfg.host}:${cfg.port}.`, 'Is the PostgreSQL service running?');
    fail(err.message);
  }

  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`  ✓ Created database "${dbName}"`);
  } else {
    console.log(`  · Database "${dbName}" already exists`);
  }
  await admin.end();

  // 2. Load schema, then seed data.
  const db = new Client({ ...cfg, database: dbName });
  await db.connect();

  for (const file of ['DDL.sql', 'data.sql']) {
    const full = path.join(__dirname, file);
    if (!fs.existsSync(full)) fail(`${file} not found next to setup-db.js`);
    await db.query(fs.readFileSync(full, 'utf8'));
    console.log(`  ✓ Ran ${file}`);
  }

  const counts = await db.query('SELECT COUNT(*)::int AS n FROM Products');
  const tables = await db.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`
  );
  await db.end();

  console.log(`\n  Tables: ${tables.rows.map((r) => r.table_name).join(', ')}`);
  console.log(`  Products seeded: ${counts.rows[0].n}`);
  console.log(`\n  Done. Start the app with:  npm start\n`);
})().catch((err) => fail(err.message));
