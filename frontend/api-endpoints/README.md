# Nadfun Analytics API Endpoints

This directory contains the Python-based GraphQL API that serves analytics data by querying the Envio indexer.

## Architecture

```
Envio Indexer (GraphQL) → Python Functions → GraphQL API → Frontend
```

- **Envio Indexer**: Provides raw blockchain data via GraphQL
- **Python Functions**: Query Envio and transform data into analytics metrics
- **GraphQL API**: Exposes analytics functions as resolvers
- **Frontend**: Consumes the unified GraphQL API

## Files

- `envio_client.py`: Client for querying Envio GraphQL endpoint
- `analytics_functions.py`: Core analytics functions (also_bought, etc.)
- `graphql_schema.py`: GraphQL schema and resolvers using Strawberry
- `main.py`: FastAPI server with GraphQL endpoint
- `requirements.txt`: Python dependencies

## Setup

1. Install dependencies:
```bash
cd frontend/api-endpoints
pip install -r requirements.txt
```

2. Start the API server:
```bash
python main.py
```

The API will be available at:
- GraphQL endpoint: http://localhost:8000/api/graphql
- GraphQL playground: http://localhost:8000/api/graphql (in browser)

## Usage

### Also Bought Analysis

Query to get detailed analysis of what other tokens were bought by holders of a specific token:

```graphql
query AlsoBoughtAnalysis($tokenAddress: String!) {
  alsoBoughtAnalysis(tokenAddress: $tokenAddress) {
    targetToken
    totalHolders
    holdersWithRecentActivity
    alsoBoughtTokens {
      token {
        address
        symbol
        name
      }
      uniqueBuyers
      stillHoldingCount
      stillHoldingPercentage
      holdersPercentage
    }
    summary {
      totalOtherTokensBought
      tokensStillHeld
      mostPopularToken {
        token {
          symbol
        }
        stillHoldingCount
      }
    }
  }
}
```

### Simple Also Bought Tokens

For just the list of tokens:

```graphql
query AlsoBoughtTokens($tokenAddress: String!) {
  alsoBoughtTokens(tokenAddress: $tokenAddress) {
    token {
      address
      symbol
      name
    }
    uniqueBuyers
    stillHoldingCount
    stillHoldingPercentage
  }
}
```

## Algorithm

The "also bought" analysis works as follows:

1. **Get Token Holders**: Query all current holders of the target token
2. **Get Recent Trades**: For each holder, get their trades in the last 48 hours
3. **Filter Buy Trades**: Only consider BUY trades for other tokens
4. **Check Current Holdings**: Verify which of those bought tokens they still hold
5. **Aggregate Results**: Return tokens sorted by how many holders still own them

This ensures we only recommend tokens that holders are actually keeping, not just day-trading.