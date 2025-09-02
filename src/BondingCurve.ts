import {
  BondingCurve,
} from "../generated/src/Handlers.gen";

import {
  Token,
  Wallet,
  Trade,
} from "../generated/src/Types.gen";

import { getOrCreateWallet } from "./utils";

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