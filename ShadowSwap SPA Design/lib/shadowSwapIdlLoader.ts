import type { Idl } from '@coral-xyz/anchor';

/**
 * Attempts to load the ShadowSwap IDL without requiring a committed JSON file.
 * Priority:
 * 1) NEXT_PUBLIC_SHADOWSWAP_IDL_JSON (inline JSON string)
 * 2) Browser fetch from NEXT_PUBLIC_SHADOWSWAP_IDL_URL (defaults to /api/idl/shadow_swap)
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
  const candidateUrls = Array.from(
    new Set(
      [
        process.env.NEXT_PUBLIC_SHADOWSWAP_IDL_URL,
        '/api/idl/shadow_swap',
        '/idl/shadow_swap.json',
      ].filter((value): value is string => Boolean(value))
    )
  );

  const errors: string[] = [];

  for (const candidate of candidateUrls) {
    try {
      // Use a full URL for server-side fetching
      const url =
        typeof window === 'undefined'
          ? new URL(candidate, 'http://localhost:3000').toString() // Adjust base URL if needed
          : candidate;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return (await res.json()) as Idl;
    } catch (e: any) {
      errors.push(`${candidate} => ${e.message}`);
    }
  }

  // Nothing worked
  throw new Error(
    'ShadowSwap IDL not found. Set NEXT_PUBLIC_SHADOWSWAP_IDL_JSON (inline), ' +
      'or host it and set NEXT_PUBLIC_SHADOWSWAP_IDL_URL (e.g., /idl/shadow_swap.json). ' +
      `Failed attempts: ${errors.join(', ')}`
  );
}

