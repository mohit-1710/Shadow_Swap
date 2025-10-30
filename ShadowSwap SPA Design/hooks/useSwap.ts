import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { swapSOLforUSDC, swapUSDCforSOL } from "../lib/onchain/orcaPool";
import { toast } from "sonner";

type SwapDirection = "SOL_TO_USDC" | "USDC_TO_SOL";

interface UseSwapProps {
  direction: SwapDirection;
  amountIn: number;
  slippage: number; // in basis points, e.g., 50 for 0.5%
}

export function useSwap() {
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapResult, setSwapResult] = useState<{
    signature: string;
    amountOut: number;
    solscanUrl: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wallet = useWallet();

  const executeSwap = async ({
    direction,
    amountIn,
    slippage,
  }: UseSwapProps) => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error("Please connect your wallet.");
      return;
    }
    if (amountIn <= 0) {
      toast.error("Please enter an amount to swap.");
      return;
    }

    setIsSwapping(true);
    setError(null);
    setSwapResult(null);
    const toastId = toast.loading("Executing swap...");

    try {
      let result;
      if (direction === "SOL_TO_USDC") {
        result = await swapSOLforUSDC(wallet as any, amountIn, slippage);
      } else {
        result = await swapUSDCforSOL(wallet as any, amountIn, slippage);
      }

      toast.success("Swap successful!", {
        id: toastId,
        action: {
          label: "View on Solscan",
          onClick: () => window.open(result.solscanUrl, "_blank"),
        },
      });
      setSwapResult(result);
    } catch (e) {
      const error = e as Error;
      toast.error(`Swap failed: ${error.message}`, { id: toastId });
      setError(error.message);
    } finally {
      setIsSwapping(false);
    }
  };

  return {
    isSwapping,
    swapResult,
    error,
    executeSwap,
  };
}
