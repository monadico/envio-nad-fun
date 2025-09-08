#!/bin/bash

TOKEN_ADDRESS="0xb470f063ff49F2a416a5150DaaAA76aD0B5E6838"
FROM_TIMESTAMP=$(($(date +%s) - 86400)) # Last 24 hours

echo "Top 3 BUY trades for token: $TOKEN_ADDRESS"
echo "=============================================="

curl -s -X POST http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetTopBuys($token_id: String!, $from_ts: numeric!) { Trade(where: { token_id: { _eq: $token_id }, timestamp: { _gte: $from_ts }, tradeType: { _eq: \"BUY\" } }, order_by: { monAmount: desc }, limit: 3) { id txHash tradeType tokenAmount monAmount timestamp source } }",
    "variables": {
      "token_id": "'$TOKEN_ADDRESS'",
      "from_ts": '$FROM_TIMESTAMP'
    }
  }' | jq -r '
    .data.Trade[] | 
    "TxHash: \(.txHash)
    Type: \(.tradeType)
    Source: \(.source)
    MON Volume: \(.monAmount) wei = \((.monAmount | tonumber) / 1000000000000000000) MON
    Token Volume: \(.tokenAmount) wei = \((.tokenAmount | tonumber) / 1000000000000000000) Tokens
    Timestamp: \(.timestamp)
    ---"
  '

echo
echo "Top 3 SELL trades for token: $TOKEN_ADDRESS"
echo "=============================================="

curl -s -X POST http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetTopSells($token_id: String!, $from_ts: numeric!) { Trade(where: { token_id: { _eq: $token_id }, timestamp: { _gte: $from_ts }, tradeType: { _eq: \"SELL\" } }, order_by: { monAmount: desc }, limit: 3) { id txHash tradeType tokenAmount monAmount timestamp source } }",
    "variables": {
      "token_id": "'$TOKEN_ADDRESS'",
      "from_ts": '$FROM_TIMESTAMP'
    }
  }' | jq -r '
    .data.Trade[] | 
    "TxHash: \(.txHash)
    Type: \(.tradeType)
    Source: \(.source)
    MON Volume: \(.monAmount) wei = \((.monAmount | tonumber) / 1000000000000000000) MON
    Token Volume: \(.tokenAmount) wei = \((.tokenAmount | tonumber) / 1000000000000000000) Tokens
    Timestamp: \(.timestamp)
    ---"
  '