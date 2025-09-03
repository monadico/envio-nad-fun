import {
  UniswapV3PoolTemplate,
} from "../generated/src/Handlers.gen";

import {
  Trade,
  Wallet,
  Token,
  Pool,
} from "../generated/src/Types.gen";

// Helper function to get or create a wallet
async function getOrCreateWallet(
  address: string,
  context: any
): Promise<Wallet> {
  let wallet = await context.Wallet.get(address);
  if (wallet === undefined) {
    wallet = {
      id: address,
      address: address,
    };
    context.Wallet.set(wallet);
  }
  return wallet;
}

// Helper function to determine trade type from Uniswap V3 Swap amounts
function determineTradeType(amount0: bigint, amount1: bigint, token0Address: string, tokenAddress: string): {
  tradeType: "BUY" | "SELL",
  tokenAmount: bigint,
  monAmount: bigint
} {
  // In Uniswap V3, negative amounts are outgoing, positive amounts are incoming
  // If token0 is our token and amount0 is positive, it's a sell (token coming in, MON going out)
  // If token1 is our token and amount1 is positive, it's a sell (token coming in, MON going out)
  
  if (token0Address.toLowerCase() === tokenAddress.toLowerCase()) {
    // Our token is token0
    if (amount0 > 0n) {
      // Token coming in, MON going out = SELL
      return {
        tradeType: "SELL",
        tokenAmount: amount0,
        monAmount: -amount1, // Make positive
      };
    } else {
      // Token going out, MON coming in = BUY
      return {
        tradeType: "BUY",
        tokenAmount: -amount0, // Make positive
        monAmount: amount1,
      };
    }
  } else {
    // Our token is token1
    if (amount1 > 0n) {
      // Token coming in, MON going out = SELL
      return {
        tradeType: "SELL",
        tokenAmount: amount1,
        monAmount: -amount0, // Make positive
      };
    } else {
      // Token going out, MON coming in = BUY
      return {
        tradeType: "BUY",
        tokenAmount: -amount1, // Make positive
        monAmount: amount0,
      };
    }
  }
}

UniswapV3PoolTemplate.Swap.handler(async ({ event, context }) => {
  const poolAddress = event.srcAddress.toLowerCase();
  
  console.log(`🔄 Swap event detected on pool: ${poolAddress}`);
  
  // Query the database for the pool-token mapping
  const pool = await context.Pool.get(poolAddress);
  
  if (!pool) {
    // This pool wasn't registered through CurveCreate, skip it
    console.log(`❌ Skipping swap on unregistered pool: ${poolAddress}`);
    return;
  }
  
  const tokenAddress = pool.token_id;
  console.log(`✅ Processing swap for registered pool ${poolAddress} -> token ${tokenAddress}`);

  const trader = await getOrCreateWallet(event.params.sender, context);

  // Get the token to verify it exists
  const token = await context.Token.get(tokenAddress);
  if (!token) {
    console.log(`Token ${tokenAddress} not found for pool ${poolAddress}`);
    return;
  }

  const { amount0, amount1 } = event.params;

  // Determine trade direction and amounts
  // In Uniswap V3: negative = outgoing, positive = incoming
  // We need to determine if this is a buy or sell of our tracked token
  
  let tradeType: "BUY" | "SELL";
  let tokenAmount: bigint;
  let monAmount: bigint;

  // Simple heuristic: if more tokens are going out than coming in, it's likely a sell
  // This assumes token0 or token1 is our tracked token, and the other is MON/WETH
  
  // For now, let's assume that if amount0 is negative (going out) and amount1 is positive (coming in),
  // then someone is selling token0 for token1
  if (amount0 < 0n && amount1 > 0n) {
    // Token0 going out, token1 coming in - selling token0 for token1
    tradeType = "SELL";
    tokenAmount = -amount0; // Make positive
    monAmount = amount1;
  } else if (amount0 > 0n && amount1 < 0n) {
    // Token0 coming in, token1 going out - buying token0 with token1
    tradeType = "BUY";
    tokenAmount = amount0;
    monAmount = -amount1; // Make positive
  } else {
    // Complex case or zero amounts, skip for now
    console.log(`Complex swap amounts in tx ${event.transaction.hash}: ${amount0}, ${amount1}`);
    return;
  }

  // Create trade record
  const trade: Trade = {
    id: event.transaction.hash + "-" + event.logIndex.toString(),
    token_id: tokenAddress, // Now using the correct token address
    trader_id: trader.id,
    tradeType: tradeType,
    source: "Uniswap V3 Pool",
    tokenAmount: tokenAmount,
    monAmount: monAmount,
    blockNumber: BigInt(event.block.number),
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  };

  context.Trade.set(trade);
  
  console.log(`Recorded ${tradeType} trade for token ${token.symbol} in tx ${event.transaction.hash}`);
});