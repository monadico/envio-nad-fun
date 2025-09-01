import {
  DexRouter,
} from "../generated/src/Handlers.gen";

import {
  Wallet,
  Trade,
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

async function handleTrade(
  event: any,
  context: any,
  tradeType: "BUY" | "SELL",
  source: "Bonding Curve" | "DEXRouter"
) {
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