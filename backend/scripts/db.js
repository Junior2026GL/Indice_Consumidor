/**
 * Runner de base de datos.
 *   node scripts/db.js migrate   -> aplica migraciones pendientes (crea la BD si no existe)
 *   node scripts/db.js seed      -> aplica los seeds (idempotentes)
 *   node scripts/db.js status    -> lista migraciones aplicadas y pendientes
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';

const baseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/infrastructure/database');

async function connect() {
  const server = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
    charset: 'utf8mb4',
  });
  await server.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await server.changeUser({ database: env.db.database });
  return server;
}

async function sqlFiles(dir) {
  const files = await fs.readdir(path.join(baseDir, dir));
  return files.filter((f) => f.endsWith('.sql')).sort();
}

async function ensureMigrationsTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(190) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
}

async function applied(conn) {
  const [rows] = await conn.query('SELECT name FROM schema_migrations');
  return new Set(rows.map((r) => r.name));
}

async function migrate(conn) {
  await ensureMigrationsTable(conn);
  const done = await applied(conn);
  let count = 0;

  for (const file of await sqlFiles('migrations')) {
    if (done.has(file)) continue;
    const sql = await fs.readFile(path.join(baseDir, 'migrations', file), 'utf8');
    console.log(`> Aplicando ${file}`);
    await conn.query(sql);
    await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
    count += 1;
  }
  console.log(count ? `Migraciones aplicadas: ${count}` : 'Base de datos al día.');
}

async function seed(conn) {
  for (const file of await sqlFiles('seeds')) {
    console.log(`> Seed ${file}`);
    await conn.query(await fs.readFile(path.join(baseDir, 'seeds', file), 'utf8'));
  }
}

async function status(conn) {
  await ensureMigrationsTable(conn);
  const done = await applied(conn);
  for (const file of await sqlFiles('migrations')) {
    console.log(`${done.has(file) ? '[x]' : '[ ]'} ${file}`);
  }
}

const commands = { migrate, seed, status };
const command = process.argv[2];

if (!commands[command]) {
  console.error('Uso: node scripts/db.js <migrate|seed|status>');
  process.exit(1);
}

const conn = await connect();
try {
  await commands[command](conn);
} catch (error) {
  console.error('Error:', error.message);
  process.exitCode = 1;
} finally {
  await conn.end();
}
