# Nadfun Analytics

A blockchain indexer for tracking token creation, trading activities, and transfers on the Monad testnet. This project uses [Envio](https://envio.dev) to index events from bonding curve contracts, DEX routers, and token contracts, providing real-time analytics through a GraphQL API.

## 🔍 What This Indexer Tracks

### Contracts Monitored
- **BondingCurve** (`0x52D34d8536350Cd997bCBD0b9E9d722452f341F5`) - Token creation and initial trading
- **DexRouter** (`0x4FBDC27FAE5f99E7B09590bEc8Bf20481FCf9551`) - DEX trading activities  
- **TokenTemplate** - Dynamic token contracts for transfer events

### Events Indexed
- **Token Creation**: When new tokens are launched through bonding curves
- **Trading**: Buy/sell transactions from both bonding curves and DEX
- **Transfers**: Token transfers between wallets
- **Transaction Hashes**: Full transaction data for all trades

## 🏗️ Architecture

### Database Schema
- **Wallets**: User addresses and their activity
- **Tokens**: Token metadata, creation info, and supply data
- **Trades**: All buy/sell transactions with full transaction hashes
- **Transfers**: Token transfer events between addresses

### Key Features
- ✅ Real-time event indexing from Monad testnet
- ✅ Transaction hash tracking for all trades
- ✅ Comprehensive wallet and token analytics
- ✅ GraphQL API with powerful filtering and aggregation
- ✅ Dynamic contract registration for new tokens

## 🚀 Quick Start

### Pre-requisites
- [Node.js (v18 or newer)](https://nodejs.org/en/download/current)
- [pnpm (v8 or newer)](https://pnpm.io/installation)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd nadfun-analytics

# Install dependencies
pnpm install

# Generate code from configuration
pnpm codegen
```

### Running the Indexer
```bash
# Start the indexer in development mode
pnpm dev
```

The indexer will:
1. Set up database migrations
2. Start indexing from block 0 on Monad testnet (Chain ID: 10143)
3. Begin processing events in real-time

### Access Points
- **GraphQL Playground**: http://localhost:8080/v1/graphql
- **Development Console**: https://envio.dev/console
- **Local Password**: `testing`

## 📊 Sample Queries

### Get Recent Trades for a Token
```graphql
query GetRecentTrades {
  Trade(
    where: { token_id: { _eq: "0xYourTokenAddress" } }
    order_by: { timestamp: desc }
    limit: 10
  ) {
    id
    trader_id
    tradeType
    tokenAmount
    monAmount
    timestamp
    txHash
    source
  }
}
```

### Count Tokens Created by Address
```graphql
query GetTokenCountByCreator {
  Token_aggregate(
    where: { creator_id: { _eq: "0x96016a630Db8656132cfC0Baade6833a26bFD9F8" } }
  ) {
    aggregate {
      count
    }
  }
}
```

### Get Token Creation History
```graphql
query GetTokenCreations {
  Token(
    order_by: { creationTimestamp: desc }
    limit: 20
  ) {
    id
    name
    symbol
    address
    creator_id
    creationTimestamp
    totalSupply
  }
}
```

### Trading Volume Analysis
```graphql
query GetTradingVolume {
  Trade_aggregate(
    where: { 
      timestamp: { _gt: "1700000000" }
      tradeType: { _eq: "BUY" }
    }
  ) {
    aggregate {
      count
      sum {
        monAmount
        tokenAmount
      }
    }
  }
}
```

## 🛠️ Development

### Project Structure
```
├── config.yaml           # Indexer configuration
├── schema.graphql         # Database schema definition  
├── src/
│   ├── BondingCurve.ts   # Bonding curve event handlers
│   ├── DexRouter.ts      # DEX router event handlers
│   └── TokenTemplate.ts  # Token transfer handlers
├── ABIs/                 # Contract ABI files
│   ├── IBondingCurve.json
│   ├── IDexRouter.json
│   └── IToken.json
└── generated/            # Auto-generated code
```

### Key Configuration
The indexer is configured to:
- Monitor Monad testnet (Chain ID: 10143)
- Track transaction hashes for all events
- Start from genesis block (block 0)
- Use HyperSync for optimal performance

### Adding New Events
1. Update `config.yaml` to add new events
2. Modify the appropriate handler file in `src/`
3. Run `pnpm codegen` to regenerate types
4. Restart the indexer with `pnpm dev`

## 📈 Analytics Use Cases

### For Token Creators
- Track adoption of newly launched tokens
- Monitor initial trading activity and volume
- Analyze user acquisition patterns

### For Traders
- Historical price and volume data
- Transaction history with full tx hashes
- Wallet activity analysis

### For Researchers
- Token ecosystem growth metrics
- DEX vs bonding curve trading patterns
- Network activity and user behavior

## 🐛 Troubleshooting

### Common Issues

**Configuration Errors**
```bash
# If you see ABI or handler file errors:
pnpm codegen
```

**Database Issues**
```bash
# Reset database if needed:
docker-compose down -v
pnpm dev
```

**Missing Transaction Hashes**
- Ensure `field_selection.transaction_fields: [hash]` is in config.yaml
- Transaction hashes are automatically captured in the `txHash` field

### Logs and Monitoring
- Development logs show real-time indexing progress
- Check the Envio console for detailed metrics
- GraphQL playground provides query testing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with sample queries
5. Submit a pull request

## 📚 Resources

- [Envio Documentation](https://docs.envio.dev)
- [GraphQL Tutorial](https://graphql.org/learn/)
- [Monad Testnet Info](https://docs.monad.xyz/)

## 📄 License

[Add your license here]

---

*Built with ❤️ using [Envio](https://envio.dev) - The fastest way to build blockchain indexers*