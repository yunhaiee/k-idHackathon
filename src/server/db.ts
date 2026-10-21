/// <reference types="node" />
// Server-only shared state. Locally: a JSON file (shared across separately bundled routes, survives reloads).
// Hosted (Vercel): Upstash Redis over REST when UPSTASH_REDIS_REST_URL/TOKEN are set, since serverless has no disk.
import fs from 'node:fs';
import path from 'node:path';

import { seedDB } from '@/lib/seed';
import type { DB } from '@/lib/types';

const FILE = path.join(process.cwd(), 'data', 'db.json');
const KEY = 'kardza:db';
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = !!(REDIS_URL && REDIS_TOKEN);

async function redis(cmd: (string | number)[]): Promise<unknown> {
  const res = await fetch(REDIS_URL!, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const data = (await res.json()) as { result?: unknown; error?: string };
  if (data.error) throw new Error(`redis: ${data.error}`);
  return data.result;
}

export async function readDB(): Promise<DB> {
  try {
    const raw = useRedis ? ((await redis(['GET', KEY])) as string | null) : fs.readFileSync(FILE, 'utf8');
    if (raw) return JSON.parse(raw) as DB;
  } catch {
    // missing file / empty key: seed below
  }
  const db = seedDB();
  await writeDB(db);
  return db;
}

export async function writeDB(db: DB) {
  const raw = JSON.stringify(db);
  if (useRedis) {
    await redis(['SET', KEY, raw]);
    return;
  }
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, raw);
}

// Serialize writes within one server process so two quick taps don't drop an update.
let chain: Promise<unknown> = Promise.resolve();

/** Read, mutate, bump version, write. */
export function mutate(fn: (db: DB) => void): Promise<DB> {
  const run = chain.then(async () => {
    const db = await readDB();
    fn(db);
    db.version += 1;
    await writeDB(db);
    return db;
  });
  chain = run.catch(() => {});
  return run;
}

export async function saveAudio(name: string, audio: Buffer) {
  if (useRedis) {
    await redis(['SET', `kardza:audio:${name}`, audio.toString('base64'), 'EX', 86400]);
    return;
  }
  fs.mkdirSync(path.join(process.cwd(), 'data', 'audio'), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), 'data', 'audio', name), audio);
}

export async function loadAudio(name: string): Promise<Buffer | null> {
  if (useRedis) {
    const b64 = (await redis(['GET', `kardza:audio:${name}`])) as string | null;
    return b64 ? Buffer.from(b64, 'base64') : null;
  }
  const file = path.join(process.cwd(), 'data', 'audio', name);
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

export const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
