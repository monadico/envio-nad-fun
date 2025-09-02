import { TokenHolding } from "../generated/src/Types.gen";

export async function updateTokenHolding(
  walletId: string,
  tokenId: string,
  amountChange: bigint,
  timestamp: bigint,
  context: any
): Promise<void> {
  const holdingId = `${walletId}-${tokenId}`;
  let holding = await context.TokenHolding.get(holdingId);
  
  if (!holding) {
    // Only create new record if the final balance will be positive
    const newBalance = amountChange;
    if (newBalance > 0n) {
      holding = {
        id: holdingId,
        wallet_id: walletId,
        token_id: tokenId,
        previousBalance: 0n, // Was 0 before this transaction
        currentBalance: newBalance,
        lastUpdated: timestamp,
        firstAcquired: timestamp
      };
      context.TokenHolding.set(holding);
    }
    // If new balance would be <= 0, don't create any record
  } else {
    // Update existing holding
    const previousBalance = holding.currentBalance;
    const newBalance = holding.currentBalance + amountChange;
    
    holding.previousBalance = previousBalance;
    holding.currentBalance = newBalance;
    holding.lastUpdated = timestamp;
    
    // Always update existing records, even if balance goes to 0
    // This preserves the historical record
    context.TokenHolding.set(holding);
  }
}

export async function getOrCreateWallet(
  address: string,
  context: any
): Promise<any> {
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