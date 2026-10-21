/// <reference types="node" />
// Server-only shared state. Every API route reads the file fresh, so state is shared across
// separately bundled routes and survives dev-server reloads. One instance only (Cloud Run max-instances=1).
import fs from 'node:fs';
import path from 'node:path';

import { seedDB } from '@/lib/seed';
import type { DB } from '@/lib/types';

const FILE = path.join(process.cwd(), 'data', 'db.json');

export function readDB(): DB {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8')) as DB;
  } catch {
    const db = seedDB();
    writeDB(db);
    return db;
  }
}

export function writeDB(db: DB) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db));
}

/** Read, mutate, bump version, write. */
export function mutate(fn: (db: DB) => void): DB {
  const db = readDB();
  fn(db);
  db.version += 1;
  writeDB(db);
  return db;
}

export const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
