import {
  MonorailAggregator,
} from "../generated/src/Handlers.gen";

import {
  Wallet,
  Trade,
} from "../generated/src/Types.gen";

import { getOrCreateWallet } from "./utils";

async function handleMonorailTrade(
  event: any,
  context: any,
  tokenAddress: string,
  tradeType: "BUY" | "SELL"
) {
  const trader = await getOrCreateWallet(event.params.sender, context);

  const trade: Trade = {
    id: event.transaction.hash + "-" + event.logIndex.toString(),
    token_id: tokenAddress,
    trader_id: trader.id,
    tradeType: tradeType,
    source: "Monorail",
    tokenAmount: tradeType === "BUY" ? event.params.amountOut : event.params.amountIn,
    monAmount: tradeType === "BUY" ? event.params.amountIn : event.params.amountOut,
    blockNumber: BigInt(event.block.number),
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  };
  context.Trade.set(trade);
}

MonorailAggregator.Aggregated.handler(async ({ event, context }) => {
  // Check if either token is from nad.fun (exists in Token table)
  const tokenInExists = await context.Token.get(event.params.tokenIn);
  const tokenOutExists = await context.Token.get(event.params.tokenOut);
  
  if (!tokenInExists && !tokenOutExists) {
    // Neither token is from nad.fun, skip this trade
    return;
  }

  // Determine which token is the nad.fun token and trade direction
  if (tokenInExists) {
    // User is selling nad.fun token (tokenIn) for something else (tokenOut)
    await handleMonorailTrade(event, context, event.params.tokenIn, "SELL");
  }
  
  if (tokenOutExists) {
    // User is buying nad.fun token (tokenOut) with something else (tokenIn)
    await handleMonorailTrade(event, context, event.params.tokenOut, "BUY");
  }
});