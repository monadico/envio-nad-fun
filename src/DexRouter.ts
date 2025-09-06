import {
  DexRouter,
} from "../generated/src/Handlers.gen";

import {
  Wallet,
  Trade,
} from "../generated/src/Types.gen";

import { getOrCreateWallet } from "./utils";

async function handleTrade(
  event: any,
  context: any,
  tradeType: "BUY" | "SELL",
  source: "Bonding Curve" | "DEXRouter"
) {
  // Check if token exists in our Token table first
  const token = await context.Token.get(event.params.token);
  if (!token) {
    // Skip trades for tokens we don't track
    return;
  }

  const trader = await getOrCreateWallet(event.params.sender, context);

  const trade: Trade = {
    id: event.transaction.hash + "-" + event.logIndex.toString(),
    token_id: event.params.token,
    trader_id: trader.id,
    tradeType: tradeType,
    source: source,
    tokenAmount: tradeType === "BUY" ? event.params.amountOut : event.params.amountIn,
    monAmount: tradeType === "BUY" ? event.params.amountIn : event.params.amountOut,
    blockNumber: BigInt(event.block.number),
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  };
  context.Trade.set(trade);
}

DexRouter.DexRouterBuy.handler(async ({ event, context }) => {
  await handleTrade(event, context, "BUY", "DEXRouter");
});

DexRouter.DexRouterSell.handler(async ({ event, context }) => {
  await handleTrade(event, context, "SELL", "DEXRouter");
});