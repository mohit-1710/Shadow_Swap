import type { Idl } from '@coral-xyz/anchor';

/**
 * Attempts to load the ShadowSwap IDL without requiring a committed JSON file.
 * Priority:
 * 1) NEXT_PUBLIC_SHADOWSWAP_IDL_JSON (inline JSON string)
 * 2) Browser fetch from NEXT_PUBLIC_SHADOWSWAP_IDL_URL (or /idl/shadow_swap.json)
 * 3) Server-side read from SHADOWSWAP_IDL_PATH (optional)
 *
 * If none are available, throws a descriptive error prompting setup.
 */
export async function loadShadowSwapIdl(): Promise<Idl> {
  // 1) Inline JSON via env (works on client/server)
  if (process.env.NEXT_PUBLIC_SHADOWSWAP_IDL_JSON) {
    try {
      return JSON.parse(process.env.NEXT_PUBLIC_SHADOWSWAP_IDL_JSON) as Idl;
    } catch (e) {
      throw new Error('Invalid NEXT_PUBLIC_SHADOWSWAP_IDL_JSON: failed to parse JSON');
    }
  }

  // 2) In the browser, try fetching from a URL (default to /idl/shadow_swap.json)
  if (typeof window !== 'undefined') {
    const url = process.env.NEXT_PUBLIC_SHADOWSWAP_IDL_URL || '/idl/shadow_swap.json';
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return (await res.json()) as Idl;
    } catch (e: any) {
      throw new Error(
        `Failed to fetch IDL from ${url}. Provide NEXT_PUBLIC_SHADOWSWAP_IDL_URL or NEXT_PUBLIC_SHADOWSWAP_IDL_JSON. (${e.message})`
      );
    }
  }

  // 3) On the server (Next.js node process), optionally read from a local path
  try {
    const path = process.env.SHADOWSWAP_IDL_PATH || '';
    if (path) {
      // Lazy import fs to avoid bundling into client
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      const raw = fs.readFileSync(path, 'utf8');
      return JSON.parse(raw) as Idl;
    }
  } catch (e: any) {
    throw new Error(`Failed to read IDL from SHADOWSWAP_IDL_PATH: ${e.message}`);
  }

  // Nothing worked
  throw new Error(
    'ShadowSwap IDL not found. Set NEXT_PUBLIC_SHADOWSWAP_IDL_JSON (inline), ' +
      'or host it and set NEXT_PUBLIC_SHADOWSWAP_IDL_URL (e.g., /idl/shadow_swap.json), ' +
      'or set SHADOWSWAP_IDL_PATH for server-side reads.'
  );
}

