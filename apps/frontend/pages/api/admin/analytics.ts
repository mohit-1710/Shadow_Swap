import type { NextApiRequest, NextApiResponse } from 'next';

// Simulate a slow API to validate timeout + fallback behavior
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  // Introduce an artificial delay (e.g., 5s) so the 4s timeout triggers
  await new Promise((r) => setTimeout(r, 5000));
  res.status(200).json({
    dau: 2345,
    wau: 6543,
    mau: 22111,
    newUsers: 102,
    topTraders: [
      { wallet: 'AA...111', trades: 180, volume: 2100000 },
      { wallet: 'BB...222', trades: 120, volume: 910000 },
    ],
  });
}

