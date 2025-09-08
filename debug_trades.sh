#!/bin/bash

# Get the current timestamp minus 24 hours
FROM_TIMESTAMP=$(($(date +%s) - 86400))

echo "Fetching first 5 trades for debugging..."
echo "Token: 0xb470f063ff49F2a416a5150DaaAA76aD0B5E6838"
echo "From timestamp: $FROM_TIMESTAMP"
echo

curl -X POST http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetTrades($token_id: String!, $from_ts: numeric!) { Trade(where: { token_id: { _eq: $token_id }, timestamp: { _gte: $from_ts } }, order_by: { timestamp: desc }, limit: 5) { id trader_id tradeType tokenAmount monAmount timestamp txHash source } }",
    "variables": {
      "token_id": "0xb470f063ff49F2a416a5150DaaAA76aD0B5E6838",
      "from_ts": '$FROM_TIMESTAMP'
    }
  }' | jq '.'