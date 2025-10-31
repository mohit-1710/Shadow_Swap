export function getMockAdminData() {
  const now = Date.now()
  const range = (n: number) => Array.from({ length: n }, (_, i) => i)
  const mk = (amp: number, base = 50) => range(30).map(i => ({ ts: now - (30 - i) * 86400000, value: Math.max(0, base + Math.sin(i / 4) * amp + (Math.random() - 0.5) * amp) }))

  const kpis = [
    { label: '24h Volume', value: '$12.3M', trend: { dir: 'up', value: '+8.2%' } },
    { label: 'Trades (24h)', value: '48,129', trend: { dir: 'up', value: '+3.4%' } },
    { label: 'Active Pairs', value: '12', sub: 'Top 5 visible' },
    { label: 'Fees (24h)', value: '$38.2k', trend: { dir: 'down', value: '-1.1%' } },
  ] as const

  const flows = {
    solToUsdc: mk(12, 70),
    usdcToSol: mk(10, 60),
    netSol: mk(5, 0),
  }

  const fees = range(30).map(i => ({ ts: now - (30 - i) * 86400000, value: Math.round(20 + Math.random() * 80) }))

  const marketHealth = [
    { pair: 'SOL/USDC', spreadBps: 4.3, depthL5: 850000, imbalancePct: 12, volatility: 0.9, status: 'ok' },
    { pair: 'JUP/USDC', spreadBps: 6.1, depthL5: 420000, imbalancePct: 18, volatility: 1.2, status: 'ok' },
    { pair: 'BONK/SOL', spreadBps: 14.2, depthL5: 120000, imbalancePct: 28, volatility: 2.1, status: 'warn' },
    { pair: 'mSOL/SOL', spreadBps: 3.2, depthL5: 770000, imbalancePct: 9, volatility: 0.7, status: 'ok' },
    { pair: 'WIF/USDC', spreadBps: 22.5, depthL5: 60000, imbalancePct: 35, volatility: 2.8, status: 'warn' },
  ] as const

  const lp = {
    tvl: 12_450_000,
    utilization: 62.3,
    topLps: [
      { owner: '8kP4…n9Q', tvlShare: 18.2, fees: 48231, apr: 26.1 },
      { owner: '4zzF…a11', tvlShare: 12.9, fees: 31120, apr: 22.4 },
      { owner: 'C3af…p0X', tvlShare: 9.4, fees: 19802, apr: 19.1 },
    ],
  }

  const users = {
    dau: 2840,
    wau: 11820,
    mau: 31840,
  }

  const bot = {
    status: 'ok' as const,
    version: '1.3.2',
    lastBlock: 213_441_992,
    queueLen: 7,
    successRate: 98.4,
    avgTTS: 3.1,
    rpcLatency: 240,
    errors: [
      { code: 'BlockhashNotFound', count: 12 },
      { code: 'ComputeExceeded', count: 4 },
      { code: 'AccountInUse', count: 2 },
    ],
  }

  const program = {
    cluster: 'devnet',
    slot: 213_441_992,
    tps: 3540,
    programId: 'ShdwSwp111111111111111111111111111111111111',
    version: '0.3.0',
    idlHash: '0x9c81c4eab7d1f9ad',
    accounts: 1284,
    rentRisk: 2.1,
    instrBreakdown: [
      { name: 'place_order', count: 5321 },
      { name: 'cancel_order', count: 1203 },
      { name: 'settle', count: 4981 },
    ],
  }

  const risk = {
    stuckEscrows: 2,
    expiredOrders: 11,
    authMismatches: 0,
    replays: 3,
    blacklistedHits: 0,
    largeWithdrawals: 1,
  }

  const alerts = range(6).map((i) => ({ id: String(i), level: (['info','warn','error'] as const)[i % 3], message: ['Spread widened on BONK/SOL','Bot retry spike','High cancel rate detected','New deployment detected','RPC latency elevated','Volume surge on SOL/USDC'][i], ts: now - i * 60000 }))

  return { kpis, flows, fees, marketHealth, lp, users, bot, program, risk, alerts }
}

