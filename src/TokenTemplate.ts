import {
  TokenTemplate,
} from "../generated/src/Handlers.gen";

import {
  Wallet,
  Transfer,
} from "../generated/src/Types.gen";

import { updateTokenHolding, getOrCreateWallet } from "./utils";

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

  // Update holdings
  const timestamp = BigInt(event.block.timestamp);
  
  // Decrease sender's balance (unless it's minting from zero address)
  if (event.params.from !== "0x0000000000000000000000000000000000000000") {
    await updateTokenHolding(
      event.params.from,
      event.srcAddress,
      -event.params.value, // Negative for outgoing
      timestamp,
      context
    );
  }
  
  // Increase receiver's balance (unless it's burning to zero address)
  if (event.params.to !== "0x0000000000000000000000000000000000000000") {
    await updateTokenHolding(
      event.params.to,
      event.srcAddress,
      event.params.value, // Positive for incoming
      timestamp,
      context
    );
  }
});