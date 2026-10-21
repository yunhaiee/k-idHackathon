/// <reference types="node" />
// Read secrets fresh from .env (re-read when the file changes) so key rotations need no server restart,
// which would also change the dev tunnel URL. Falls back to process.env (Vercel/Cloud Run have no .env file).
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(process.cwd(), '.env');
let cache: { mtime: number; vars: Record<string, string> } | null = null;

function load(): Record<string, string> {
  try {
    const mtime = fs.statSync(FILE).mtimeMs;
    if (cache && cache.mtime === mtime) return cache.vars;
    const vars: Record<string, string> = {};
    for (const line of fs.readFileSync(FILE, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(\S*)/);
      if (m && m[2] && !m[2].startsWith('#')) vars[m[1]] = m[2];
    }
    cache = { mtime, vars };
    return vars;
  } catch {
    return {};
  }
}

export function env(key: string): string | undefined {
  return load()[key] || process.env[key] || undefined;
}
