import {
  BondingCurve,
  DexRouter,
  TokenTemplate,
} from "../generated/src/Handlers.gen";

import {
  Token,
  Wallet,
  Transfer,
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

// ---- Contract Registration ----
BondingCurve.CurveCreate.contractRegister(({ event, context }) => {
  context.addTokenTemplate(event.params.token);
});

// ---- Event Handlers ----

BondingCurve.CurveCreate.handler(async ({ event, context }) => {
  const creator = await getOrCreateWallet(event.params.creator, context);

  const token: Token = {
    id: event.params.token,
    address: event.params.token,
    name: event.params.name,
    symbol: event.params.symbol,
    creator_id: creator.id,
    totalSupply: 0n,
    creationTimestamp: BigInt(event.block.timestamp),
  };
  context.Token.set(token);
});

TokenTemplate.Transfer.handler(async ({ event, context }) => {
  const from = await getOrCreateWallet(event.params.from, context);
  const to = await getOrCreateWallet(event.params.to, context);

  const transfer: Transfer = {
    id: event.transaction.hash + "-" + event.logIndex.toString(),
    token_id: event.srcAddress,
    from_id: from.id,
    to_id: to.id,
    amount: event.params.value,
    blockNumber: BigInt(event.block.number),
    timestamp: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  };
  context.Transfer.set(transfer);
});

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

BondingCurve.CurveBuy.handler(async ({ event, context }) => {
  await handleTrade(event, context, "BUY", "Bonding Curve");
});

BondingCurve.CurveSell.handler(async ({ event, context }) => {
  await handleTrade(event, context, "SELL", "Bonding Curve");
});

DexRouter.DexRouterBuy.handler(async ({ event, context }) => {
  await handleTrade(event, context, "BUY", "DEXRouter");
});

DexRouter.DexRouterSell.handler(async ({ event, context }) => {
  await handleTrade(event, context, "SELL", "DEXRouter");
});