"use client"

import { useEffect, useMemo, useState } from "react"
import { Connection, LAMPORTS_PER_SOL, PublicKey, clusterApiUrl } from "@solana/web3.js"
import { getAssociatedTokenAddress } from "@solana/spl-token"
import { useWallet } from "@/contexts/WalletContext"
import { isAdminAddress } from "@/lib/admin"
import { ShadowSwapClient } from "@/lib/shadowSwapClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LoaderInline } from "@/components/ui/loader"
import { Input } from "@/components/ui/input"

type UserRow = {
  owner: string
  balanceSol: number
  balanceUsdc: number
  orderCount: number
}

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl("devnet")

export default function AdminPage() {
  const { walletAddress, wallet, isWalletConnected } = useWallet()
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<UserRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const isAdmin = useMemo(() => isAdminAddress(walletAddress), [walletAddress])

  // Compute filtered rows early so hooks order remains stable across renders
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => r.owner.toLowerCase().includes(q))
  }, [rows, search])

  useEffect(() => {
    if (!isWalletConnected || !isAdmin) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const client = ShadowSwapClient.fromWallet(wallet)
        const orders = await client.fetchAllOrders()

        // Aggregate counts per owner
        const counts = new Map<string, number>()
        for (const o of orders) {
          // account.owner in IDL; client casts to OrderData with owner as PublicKey
          const ownerStr = (o as any).owner?.toString?.() || ""
          if (!ownerStr) continue
          counts.set(ownerStr, (counts.get(ownerStr) || 0) + 1)
        }

        const uniqueOwners = Array.from(counts.keys())
        const connection = new Connection(RPC_URL, "confirmed")

        // Fetch SOL balances in parallel
        const solBalances = await Promise.all(
          uniqueOwners.map(async (k) => {
            try {
              const lamports = await connection.getBalance(new PublicKey(k))
              return lamports / LAMPORTS_PER_SOL
            } catch {
              return 0
            }
          })
        )

        // Fetch USDC balances in parallel
        const USDC_MINT = process.env.NEXT_PUBLIC_QUOTE_MINT
          ? new PublicKey(process.env.NEXT_PUBLIC_QUOTE_MINT)
          : undefined

        const usdcBalances = await Promise.all(
          uniqueOwners.map(async (k) => {
            if (!USDC_MINT) return 0
            try {
              const ownerPk = new PublicKey(k)
              // Prefer direct ATA, fallback to parsed accounts sum
              const ata = await getAssociatedTokenAddress(USDC_MINT, ownerPk)
              const ataInfo = await connection.getParsedAccountInfo(ata)
              if (ataInfo.value && "data" in ataInfo.value && (ataInfo.value.data as any).parsed) {
                const parsed = (ataInfo.value.data as any).parsed
                const ui = parsed?.info?.tokenAmount?.uiAmount || 0
                return ui as number
              }

              const parsedResp = await connection.getParsedTokenAccountsByOwner(ownerPk, { mint: USDC_MINT })
              const total = parsedResp.value.reduce((sum, acc) => {
                const ui = (acc.account.data as any).parsed?.info?.tokenAmount?.uiAmount || 0
                return sum + (ui as number)
              }, 0)
              return total
            } catch {
              return 0
            }
          })
        )

        const data: UserRow[] = uniqueOwners.map((k, i) => ({
          owner: k,
          balanceSol: solBalances[i],
          balanceUsdc: usdcBalances[i],
          orderCount: counts.get(k) || 0,
        }))

        // Sort by order count desc
        data.sort((a, b) => b.orderCount - a.orderCount)
        setRows(data)
      } catch (e: any) {
        setError(e?.message || "Failed to load admin data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isWalletConnected, isAdmin, wallet])

  if (!isWalletConnected) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/70">Connect your wallet to continue.</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Unauthorized</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/70">This page is only accessible to admins.</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-white/60 text-sm mt-1">Users</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Users</CardTitle>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-white/70 text-sm">Total Users: {rows.length}</div>
              <Input
                placeholder="Search by public key"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoaderInline text="Loading users..." />
          ) : error ? (
            <p className="text-red-400">{error}</p>
          ) : (
            <div className="max-h-[480px] overflow-y-auto rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>SOL Balance</TableHead>
                    <TableHead>USDC Balance</TableHead>
                    <TableHead>Order Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-white/60">No users found.</TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((r) => (
                      <TableRow key={r.owner}>
                        <TableCell className="font-mono text-xs text-white/90">{r.owner}</TableCell>
                        <TableCell>{r.balanceSol.toFixed(4)}</TableCell>
                        <TableCell>{r.balanceUsdc.toFixed(2)}</TableCell>
                        <TableCell>{r.orderCount}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
