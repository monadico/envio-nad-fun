import {
  UniswapV3PoolTemplate,
} from "../generated/src/Handlers.gen";

import {
  Trade,
  Wallet,
  Token,
} from "../generated/src/Types.gen";

import { getOrCreateWallet, checkForDuplicateTrade } from "./utils";

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

  // Check for duplicate trade from DEXRouter (prioritize DEXRouter over Uniswap)
  const hasDuplicateTrade = await checkForDuplicateTrade(event.transaction.hash, tokenAddress, context);
  if (hasDuplicateTrade) {
    return; // Skip this Uniswap trade since DEXRouter trade already exists
  }

  const sender = await getOrCreateWallet(event.params.sender, context);
  const recipient = await getOrCreateWallet(event.params.recipient, context);

  // FIXED: amount0 = MON token, amount1 = meme token (always)
  // Negative values = tokens leaving pool (going to user)
  // Positive values = tokens entering pool (coming from user)
  
  let tradeType: "BUY" | "SELL";
  let trader: Wallet;
  let tokenAmount: bigint;
  let monAmount: bigint;

  if (event.params.amount1 < 0n) {
    // User is receiving meme tokens (amount1 negative), so buying
    tradeType = "BUY";
    trader = sender;  // Sender initiates the trade
    tokenAmount = BigInt(event.params.amount1) * -1n;  // Meme token amount (make positive)
    monAmount = BigInt(event.params.amount0);          // MON amount (positive = user paid MON)
  } else if (event.params.amount0 < 0n) {
    // User is receiving MON (amount0 negative), so selling meme tokens
    tradeType = "SELL";
    trader = sender;  // Sender initiates the trade
    tokenAmount = BigInt(event.params.amount1);        // Meme token amount (positive = user sold tokens)
    monAmount = BigInt(event.params.amount0) * -1n;    // MON amount (make positive = user received MON)
  } else {
    // Edge case - shouldn't happen in normal swaps
    tradeType = "BUY";
    trader = sender;
    tokenAmount = BigInt(event.params.amount1);        // Meme token amount
    monAmount = BigInt(event.params.amount0);          // MON amount
  }

  const trade: Trade = {
    id: event.transaction.hash + "-" + tokenAddress, // Use txHash + tokenAddress for consistency
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