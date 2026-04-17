import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Force-load vars from .env.local if the shell has them set to empty string.
// Next.js skips .env.local for vars that are already defined (even as ""),
// so we manually override empty strings with the file values.
try {
  const __dir = dirname(fileURLToPath(import.meta.url));
  const raw = readFileSync(resolve(__dir, '.env.local'), 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && val && !process.env[key]) {
      process.env[key] = val;
    }
  }
} catch {
  // .env.local not present — that's fine
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['playwright', 'playwright-core'],
  experimental: {
    serverComponentsExternalPackages: ['playwright', 'playwright-core'],
  },
}

export default nextConfig
