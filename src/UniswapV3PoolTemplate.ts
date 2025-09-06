import {
  UniswapV3PoolTemplate,
} from "../generated/src/Handlers.gen";

import {
  Trade,
  Wallet,
  Token,
} from "../generated/src/Types.gen";

import { getOrCreateWallet } from "./utils";

// Store pool-to-token mapping (in production, this should be in database)
const POOL_TO_TOKEN_MAP = new Map<string, string>();

// No need for pre-populated mappings when running from block 0
// CurveCreate events will register pools naturally as tokens are created

// Export function to register pool-token mapping
export function registerPoolToken(poolAddress: string, tokenAddress: string) {
  // Store original case for tokenAddress since that's how it's stored in database
  POOL_TO_TOKEN_MAP.set(poolAddress.toLowerCase(), tokenAddress);
}

UniswapV3PoolTemplate.Swap.handler(async ({ event, context }) => {
  // Try to find token by pool address from our mapping
  const tokenAddress = POOL_TO_TOKEN_MAP.get(event.srcAddress.toLowerCase());
  
  if (!tokenAddress) {
    return; // Pool not in our tracking list
  }

  let nadFunToken = await context.Token.get(tokenAddress);
  if (!nadFunToken) {
    // Don't create placeholder tokens - let CurveCreate events handle proper token creation
    // This swap will be processed when the token is properly created
    return; // Token not found
  }

  const sender = await getOrCreateWallet(event.params.sender, context);
  const recipient = await getOrCreateWallet(event.params.recipient, context);

  // Determine trade direction based on amount0 and amount1
  // amount0/amount1 represent the token amounts in the swap
  // Positive = token going to recipient, Negative = token coming from recipient
  
  let tradeType: "BUY" | "SELL";
  let trader: Wallet;
  let tokenAmount: bigint;
  let monAmount: bigint;

  // For nad.fun tokens, we need to determine which is token0 and which is token1
  // Based on your example: amount1 was negative (-76077893654847100771657)
  // This suggests the user was receiving the nad.fun token (buying)
  
  if (event.params.amount1 < 0n) {
    // User is receiving token1 (nad.fun token), so buying
    tradeType = "BUY";
    trader = recipient;
    tokenAmount = BigInt(event.params.amount1) * -1n; // Make positive
    monAmount = BigInt(event.params.amount0);
  } else if (event.params.amount0 < 0n) {
    // User is receiving token0 (nad.fun token), so buying  
    tradeType = "BUY";
    trader = recipient;
    tokenAmount = BigInt(event.params.amount0) * -1n; // Make positive
    monAmount = BigInt(event.params.amount1);
  } else {
    // This is likely a sell transaction
    tradeType = "SELL";
    trader = sender;
    // Use the positive amount as tokens being sold
    if (event.params.amount0 > 0n) {
      tokenAmount = BigInt(event.params.amount0);
      monAmount = BigInt(event.params.amount1) * -1n; // Make positive
    } else {
      tokenAmount = BigInt(event.params.amount1);  
      monAmount = BigInt(event.params.amount0) * -1n; // Make positive
    }
  }

  const trade: Trade = {
    id: event.transaction.hash + "-" + event.logIndex.toString(),
    token_id: nadFunToken.id,
    trader_id: trader.id,
    tradeType: tradeType,
    source: "Uniswap",
    tokenAmount: tokenAmount,
    monAmount: monAmount,
    blockNumber: BigInt(event.block.number),
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  };
  
  context.Trade.set(trade);
});