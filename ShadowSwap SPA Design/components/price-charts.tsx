"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

// Generate mock data for SOL/USDC price (SOL in terms of USDC)
const generateSolUsdcData = () => {
  const data = []
  let basePrice = 142.5
  
  for (let i = 0; i < 30; i++) {
    const volatility = (Math.random() - 0.5) * 4 // Random fluctuation
    basePrice += volatility
    basePrice = Math.max(135, Math.min(150, basePrice)) // Keep in realistic range
    
    data.push({
      time: `${i}h`,
      price: parseFloat(basePrice.toFixed(2)),
    })
  }
  
  return data
}

// Generate mock data for USDC/SOL price (USDC in terms of SOL)
const generateUsdcSolData = () => {
  const data = []
  let basePrice = 0.007 // 1 USDC ≈ 0.007 SOL (inverse of ~142.5)
  
  for (let i = 0; i < 30; i++) {
    const volatility = (Math.random() - 0.5) * 0.0002
    basePrice += volatility
    basePrice = Math.max(0.0066, Math.min(0.0074, basePrice))
    
    data.push({
      time: `${i}h`,
      price: parseFloat(basePrice.toFixed(6)),
    })
  }
  
  return data
}

const solUsdcData = generateSolUsdcData()
const usdcSolData = generateUsdcSolData()

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/90 border border-purple-500/30 rounded-lg p-3 backdrop-blur-md">
        <p className="text-white/60 text-sm">{label}</p>
        <p className="text-purple-400 font-bold">
          {payload[0].value.toFixed(payload[0].value < 1 ? 6 : 2)}
        </p>
      </div>
    )
  }
  return null
}

export function PriceCharts() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* SOL/USDC Chart */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center justify-between">
            <span>SOL/USDC Price</span>
            <span className="text-purple-400 text-xs sm:text-sm font-normal">
              ${solUsdcData[solUsdcData.length - 1].price.toFixed(2)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={200} minWidth={300}>
            <LineChart data={solUsdcData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="time" 
                stroke="rgba(255,255,255,0.3)"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.3)"
                style={{ fontSize: '12px' }}
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#a855f7" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: "#a855f7", stroke: "#fff", strokeWidth: 2 }}
              />
            </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-between text-xs text-white/50">
            <span>Last 30 hours</span>
            <span>Mock Data</span>
          </div>
        </CardContent>
      </Card>

      {/* USDC/SOL Chart */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center justify-between">
            <span>USDC/SOL Price</span>
            <span className="text-purple-400 text-xs sm:text-sm font-normal">
              {usdcSolData[usdcSolData.length - 1].price.toFixed(6)} SOL
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={200} minWidth={300}>
            <LineChart data={usdcSolData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="time" 
                stroke="rgba(255,255,255,0.3)"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.3)"
                style={{ fontSize: '12px' }}
                domain={['dataMin - 0.0001', 'dataMax + 0.0001']}
                tickFormatter={(value) => value.toFixed(4)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#c084fc" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: "#c084fc", stroke: "#fff", strokeWidth: 2 }}
              />
            </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-between text-xs text-white/50">
            <span>Last 30 hours</span>
            <span>Mock Data</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

