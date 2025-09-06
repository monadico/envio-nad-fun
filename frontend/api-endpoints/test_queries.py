#!/usr/bin/env python3
"""
Test GraphQL Queries - Individual queries for each metric
"""

import requests
import json
from datetime import datetime, timedelta

ENDPOINT = "https://indexer.hyperindex.xyz/2fe958e/v1/graphql"

def query_graphql(query: str, variables: dict = None):
    """Execute a GraphQL query"""
    response = requests.post(ENDPOINT, json={"query": query, "variables": variables or {}})
    response.raise_for_status()
    result = response.json()
    if "errors" in result:
        print(f"GraphQL errors: {result['errors']}")
        return None
    return result["data"]

def test_token_info(token_address: str):
    """Query 1: Get basic token information"""
    query = """
    query GetTokenInfo($tokenAddress: String!) {
        Token(where: {address: {_eq: $tokenAddress}}) {
            address
            symbol
            name
            totalSupply
            creationTimestamp
        }
    }
    """
    
    print("=== QUERY 1: Token Basic Info ===")
    result = query_graphql(query, {"tokenAddress": token_address})
    if result and result.get("Token"):
        token = result["Token"][0]
        print(f"Token: {token['symbol']} ({token['name']})")
        print(f"Address: {token['address']}")
        print(f"Total Supply: {token['totalSupply']}")
        print(f"Creation: {token['creationTimestamp']}")
        return token
    return None

def test_token_transfers(token_address: str):
    """Query 2: Get all token transfers for balance calculation"""
    query = """
    query GetTokenTransfers($tokenAddress: String!) {
        Transfer(
            where: {token: {address: {_eq: $tokenAddress}}}
            order_by: {timestamp: asc}
        ) {
            from { address }
            to { address }
            amount
            timestamp
        }
    }
    """
    
    print("\n=== QUERY 2: Token Transfers (for balance calculation) ===")
    result = query_graphql(query, {"tokenAddress": token_address})
    if result:
        transfers = result.get("Transfer", [])
        print(f"Found {len(transfers)} transfers")
        
        # Calculate balances (same logic as Python script)
        balances = {}
        first_acquired = {}
        last_updated = {}
        
        for transfer in transfers:
            from_addr = transfer.get('from', {}).get('address') if transfer.get('from') else None
            to_addr = transfer.get('to', {}).get('address') if transfer.get('to') else None
            amount = int(transfer.get('amount', 0))
            timestamp = int(transfer.get('timestamp', 0))
            
            # Handle sender
            if from_addr and from_addr != '0x0000000000000000000000000000000000000000':
                if from_addr not in balances:
                    balances[from_addr] = 0
                balances[from_addr] -= amount
                last_updated[from_addr] = timestamp
            
            # Handle receiver
            if to_addr and to_addr != '0x0000000000000000000000000000000000000000':
                if to_addr not in balances:
                    balances[to_addr] = 0
                    first_acquired[to_addr] = timestamp
                balances[to_addr] += amount
                last_updated[to_addr] = timestamp
        
        # Calculate current and exited holders
        current_holders = []
        exited_holders = []
        now_secs = int(datetime.now().timestamp())
        
        for address, balance in balances.items():
            holder_data = {
                'address': address,
                'balance': balance,
                'first_acquired': first_acquired.get(address, 0),
                'last_updated': last_updated.get(address, 0)
            }
            
            if balance > 0:
                current_holders.append(holder_data)
            else:
                exited_holders.append(holder_data)
        
        # Calculate average hold times
        current_durations = []
        exited_durations = []
        
        for holder in current_holders:
            if holder['first_acquired'] > 0:
                duration = max(0, now_secs - holder['first_acquired'])
                current_durations.append(duration)
        
        for holder in exited_holders:
            if holder['first_acquired'] > 0 and holder['last_updated'] > holder['first_acquired']:
                duration = holder['last_updated'] - holder['first_acquired']
                exited_durations.append(duration)
        
        avg_current = int(sum(current_durations) / max(len(current_durations), 1)) if current_durations else 0
        avg_exited = int(sum(exited_durations) / max(len(exited_durations), 1)) if exited_durations else 0
        avg_overall = int(sum(current_durations + exited_durations) / max(len(current_durations + exited_durations), 1)) if (current_durations or exited_durations) else 0
        
        def format_duration(seconds):
            days = seconds // 86400
            hours = (seconds % 86400) // 3600
            minutes = (seconds % 3600) // 60
            if days > 0:
                return f"{days}d {hours}h"
            if hours > 0:
                return f"{hours}h {minutes}m"
            return f"{minutes}m"
        
        print(f"Current holders: {len(current_holders)}")
        print(f"Exited holders: {len(exited_holders)}")
        print(f"Avg hold time (current): {format_duration(avg_current)} (based on {len(current_durations)} holders)")
        print(f"Avg hold time (exited): {format_duration(avg_exited)} (based on {len(exited_durations)} holders)")
        print(f"Avg hold time (overall): {format_duration(avg_overall)}")
        
        # Return current holder addresses for next queries
        return [h['address'] for h in current_holders]
    
    return []

def test_holder_trades(holder_addresses: list):
    """Query 3: Get trades from holders in last 24 hours"""
    if not holder_addresses:
        print("\n=== QUERY 3: Holder Trades ===")
        print("No holders to query")
        return []
    
    # Calculate 24 hours ago timestamp
    hours_back = 24
    timestamp_cutoff = int((datetime.now() - timedelta(hours=hours_back)).timestamp())
    
    query = """
    query GetHolderTrades($walletAddresses: [String!]!) {
        Trade(
            where: {
                trader: {address: {_in: $walletAddresses}}
            }
        ) {
            id
            token {
                address
                symbol
                name
            }
            trader {
                address
            }
            tradeType
            tokenAmount
            monAmount
            timestamp
            txHash
        }
    }
    """
    
    print(f"\n=== QUERY 3: Holder Trades (from {len(holder_addresses)} holders) ===")
    result = query_graphql(query, {"walletAddresses": holder_addresses})
    if result:
        trades = result.get("Trade", [])
        
        # Filter to last 24 hours
        current_time = int(datetime.now().timestamp())
        recent_trades = []
        for trade in trades:
            trade_time = int(trade['timestamp'])
            if current_time - trade_time <= 24 * 3600:
                recent_trades.append(trade)
        
        print(f"Found {len(recent_trades)} trades in last 24 hours (from {len(trades)} total)")
        
        # Analyze buy trades for also-bought tokens
        buy_trades = [t for t in recent_trades if t['tradeType'] == 'BUY']
        sell_trades = [t for t in recent_trades if t['tradeType'] == 'SELL']
        
        print(f"BUY trades: {len(buy_trades)}")
        print(f"SELL trades: {len(sell_trades)}")
        
        # Find also-bought tokens
        also_bought_tokens = {}
        for trade in buy_trades:
            token_addr = trade['token']['address']
            if token_addr not in also_bought_tokens:
                also_bought_tokens[token_addr] = {
                    'token': trade['token'],
                    'buyers': set(),
                    'wmon_volume': 0
                }
            
            trader_address = trade['trader']['address']
            if trader_address:
                also_bought_tokens[token_addr]['buyers'].add(trader_address)
            
            wmon_amount = int(trade.get('monAmount', 0))
            also_bought_tokens[token_addr]['wmon_volume'] += wmon_amount
        
        print(f"Also-bought tokens: {len(also_bought_tokens)}")
        for token_addr, data in list(also_bought_tokens.items())[:5]:
            symbol = data['token']['symbol'] or 'Unknown'
            unique_buyers = len(data['buyers'])
            wmon_volume = data['wmon_volume'] / (10**18)
            print(f"- {symbol}: {unique_buyers} holders, {wmon_volume:.4f} WMON volume")
        
        return list(also_bought_tokens.keys())
    
    return []

def test_also_bought_holdings(also_bought_addresses: list, holder_addresses: list):
    """Query 4: Check current holdings of also-bought tokens"""
    if not also_bought_addresses or not holder_addresses:
        print("\n=== QUERY 4: Also-Bought Current Holdings ===")
        print("No tokens or holders to query")
        return
    
    print(f"\n=== QUERY 4: Also-Bought Current Holdings ({len(also_bought_addresses)} tokens) ===")
    
    still_held_tokens = []
    
    for token_addr in also_bought_addresses:
        query = """
        query GetTokenTransfers($tokenAddress: String!) {
            Transfer(
                where: {token: {address: {_eq: $tokenAddress}}}
                order_by: {timestamp: asc}
            ) {
                from { address }
                to { address }
                amount
                timestamp
            }
            Token(where: {address: {_eq: $tokenAddress}}) {
                address
                symbol
                name
            }
        }
        """
        
        result = query_graphql(query, {"tokenAddress": token_addr})
        if not result:
            continue
            
        transfers = result.get("Transfer", [])
        tokens = result.get("Token", [])
        
        if not tokens:
            continue
        
        token_info = tokens[0]
        
        # Calculate balances
        balances = {}
        
        for transfer in transfers:
            from_addr = transfer.get('from', {}).get('address') if transfer.get('from') else None
            to_addr = transfer.get('to', {}).get('address') if transfer.get('to') else None
            amount = int(transfer.get('amount', 0))
            
            # Handle sender
            if from_addr and from_addr != '0x0000000000000000000000000000000000000000':
                if from_addr not in balances:
                    balances[from_addr] = 0
                balances[from_addr] -= amount
            
            # Handle receiver
            if to_addr and to_addr != '0x0000000000000000000000000000000000000000':
                if to_addr not in balances:
                    balances[to_addr] = 0
                balances[to_addr] += amount
        
        # Check if any of our holders still hold this token
        holders_still_holding = 0
        for holder_addr in holder_addresses:
            if holder_addr in balances and balances[holder_addr] > 0:
                holders_still_holding += 1
        
        if holders_still_holding > 0:
            still_held_tokens.append({
                'token': token_info,
                'holders_count': holders_still_holding
            })
    
    print(f"Tokens still held: {len(still_held_tokens)}")
    for item in still_held_tokens[:5]:
        symbol = item['token']['symbol'] or 'Unknown'
        print(f"- {symbol}: {item['holders_count']} holders still holding")

def main():
    token_address = "0xe8318358D1876111d22047AC346c1931c9ad83B4"
    
    # Query 1: Basic token info
    token_info = test_token_info(token_address)
    
    # Query 2: Token transfers and holder analysis
    current_holder_addresses = test_token_transfers(token_address)
    
    # Query 3: Holder trades
    also_bought_addresses = test_holder_trades(current_holder_addresses)
    
    # Query 4: Also-bought current holdings
    test_also_bought_holdings(also_bought_addresses, current_holder_addresses)

if __name__ == "__main__":
    main()