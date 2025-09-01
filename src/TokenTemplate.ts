import {
  TokenTemplate,
} from "../generated/src/Handlers.gen";

import {
  Wallet,
  Transfer,
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