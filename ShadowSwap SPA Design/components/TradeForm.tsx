"use client";

import { useState } from "react";
import { useSwap } from "@/hooks/useSwap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TradeForm() {
  const [amountIn, setAmountIn] = useState(0);
  const [direction, setDirection] = useState<"SOL_TO_USDC" | "USDC_TO_SOL">(
    "SOL_TO_USDC"
  );
  const { executeSwap, isSwapping, swapResult, error } = useSwap();

  const handleSwap = () => {
    executeSwap({
      direction,
      amountIn,
      slippage: 50, // 0.5%
    });
  };

  const fromToken = direction === "SOL_TO_USDC" ? "SOL" : "USDC";
  const toToken = direction === "SOL_TO_USDC" ? "USDC" : "SOL";

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Whirlpool Swap (Devnet)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>
            {fromToken} → {toToken}
          </Label>
          <Switch
            checked={direction === "USDC_TO_SOL"}
            onCheckedChange={(checked) =>
              setDirection(checked ? "USDC_TO_SOL" : "SOL_TO_USDC")
            }
          />
        </div>
        <div>
          <Label htmlFor="amount">Amount to swap ({fromToken})</Label>
          <Input
            id="amount"
            type="number"
            value={amountIn}
            onChange={(e) => setAmountIn(parseFloat(e.target.value) || 0)}
            placeholder={`Amount of ${fromToken}`}
          />
        </div>
        <Button onClick={handleSwap} disabled={isSwapping} className="w-full">
          {isSwapping ? "Swapping..." : "Swap"}
        </Button>

        {swapResult && (
          <div className="p-4 mt-4 text-sm text-green-700 bg-green-100 rounded-md">
            <p>Swap successful!</p>
            <p>Amount out: {swapResult.amountOut.toFixed(6)}</p>
            <a
              href={swapResult.solscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View on Solscan
            </a>
          </div>
        )}

        {error && (
          <div className="p-4 mt-4 text-sm text-red-700 bg-red-100 rounded-md">
            <p>Error: {error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
