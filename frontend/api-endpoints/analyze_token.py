#!/usr/bin/env python3
"""
Token Analysis Tool - Retrieve and analyze token holder data from Envio GraphQL API

Usage: python analyze_token.py --token 0xF716AE57Ce5fAf803D021c81E2Bbe1AD622fE85c
"""

import requests
import json
import argparse
from typing import Dict, List, Any
from datetime import datetime, timedelta

# Envio GraphQL endpoint
ENVIO_ENDPOINT = "https://indexer.hyperindex.xyz/2fe958e/v1/graphql"

def query_graphql(query: str, variables: Dict[str, Any] = None) -> Dict[str, Any]:
    """Execute a GraphQL query against Envio endpoint"""
    payload = {
        "query": query,
        "variables": variables or {}
    }
    
    response = requests.post(ENVIO_ENDPOINT, json=payload)
    response.raise_for_status()
    
    result = response.json()
    if "errors" in result:
        raise Exception(f"GraphQL errors: {result['errors']}")
        
    return result["data"]

def get_token_info(token_address: str) -> Dict[str, Any]:
    """Get basic token information"""
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
    
    result = query_graphql(query, {"tokenAddress": token_address})
    tokens = result.get("Token", [])
    
    if not tokens:
        raise Exception(f"Token {token_address} not found")
        
    return tokens[0]

def get_token_holders(token_address: str, min_balance: int = 0) -> List[Dict[str, Any]]:
    """Get all current holders of a specific token by analyzing Transfer events"""
    # First get all transfers for this token
    query = """
    query GetTokenTransfers($tokenAddress: String!) {
        Transfer(
            where: {
                token: {address: {_eq: $tokenAddress}}
            }
            order_by: {timestamp: asc}
        ) {
            from {
                address
            }
            to {
                address
            }
            amount
            timestamp
        }
    }
    """
    
    variables = {
        "tokenAddress": token_address
    }
    
    result = query_graphql(query, variables)
    transfers = result.get("Transfer", [])
    
    # Calculate current balances from transfers
    balances = {}
    first_acquired = {}
    last_updated = {}
    
    for transfer in transfers:
        from_addr = transfer.get('from', {}).get('address') if transfer.get('from') else None
        to_addr = transfer.get('to', {}).get('address') if transfer.get('to') else None
        amount = int(transfer.get('amount', 0))
        timestamp = int(transfer.get('timestamp', 0))
        
        # Handle mint (from null/zero address)
        if from_addr and from_addr != '0x0000000000000000000000000000000000000000':
            if from_addr not in balances:
                balances[from_addr] = 0
            balances[from_addr] -= amount
            last_updated[from_addr] = timestamp
        
        # Handle receive (to address)
        if to_addr and to_addr != '0x0000000000000000000000000000000000000000':
            if to_addr not in balances:
                balances[to_addr] = 0
                first_acquired[to_addr] = timestamp
            balances[to_addr] += amount
            last_updated[to_addr] = timestamp
    
    # Convert to expected format
    holders = []
    for address, balance in balances.items():
        if balance > min_balance:
            holders.append({
                'wallet': {'address': address},
                'currentBalance': str(balance),
                'lastUpdated': str(last_updated.get(address, 0)),
                'firstAcquired': str(first_acquired.get(address, 0))
            })
    
    return holders

def _format_duration(seconds: int) -> str:
    days = seconds // 86400
    hours = (seconds % 86400) // 3600
    minutes = (seconds % 3600) // 60
    if days > 0:
        return f"{days}d {hours}h"
    if hours > 0:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"

def get_all_token_holdings(token_address: str) -> List[Dict[str, Any]]:
    """Get all holdings entries for a token (includes exited holders with 0 balance)."""
    # Use the same logic as get_token_holders but include zero balances
    query = """
    query GetTokenTransfers($tokenAddress: String!) {
        Transfer(
            where: {
                token: {address: {_eq: $tokenAddress}}
            }
            order_by: {timestamp: asc}
        ) {
            from {
                address
            }
            to {
                address
            }
            amount
            timestamp
        }
    }
    """
    
    variables = {"tokenAddress": token_address}
    result = query_graphql(query, variables)
    transfers = result.get("Transfer", [])
    
    # Calculate all balances (including zero)
    balances = {}
    first_acquired = {}
    last_updated = {}
    
    for transfer in transfers:
        from_addr = transfer.get('from', {}).get('address') if transfer.get('from') else None
        to_addr = transfer.get('to', {}).get('address') if transfer.get('to') else None
        amount = int(transfer.get('amount', 0))
        timestamp = int(transfer.get('timestamp', 0))
        
        # Handle mint (from null/zero address)
        if from_addr and from_addr != '0x0000000000000000000000000000000000000000':
            if from_addr not in balances:
                balances[from_addr] = 0
            balances[from_addr] -= amount
            last_updated[from_addr] = timestamp
        
        # Handle receive (to address)
        if to_addr and to_addr != '0x0000000000000000000000000000000000000000':
            if to_addr not in balances:
                balances[to_addr] = 0
                first_acquired[to_addr] = timestamp
            balances[to_addr] += amount
            last_updated[to_addr] = timestamp
    
    # Convert to expected format (include all addresses, even with 0 balance)
    holdings = []
    for address, balance in balances.items():
        holdings.append({
            'wallet': {'address': address},
            'currentBalance': str(balance),
            'previousBalance': '0',  # We don't have this info from transfers
            'lastUpdated': str(last_updated.get(address, 0)),
            'firstAcquired': str(first_acquired.get(address, 0))
        })
    
    return holdings

def get_wallet_trades(wallet_addresses: List[str], hours_back: int = 24) -> List[Dict[str, Any]]:
    """Get all trades for specific wallets in the given time period"""
    timestamp_cutoff = int((datetime.now() - timedelta(hours=hours_back)).timestamp())
    
    query = """
    query GetWalletTrades($walletAddresses: [String!]!) {
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
    
    variables = {
        "walletAddresses": wallet_addresses
    }
    
    result = query_graphql(query, variables)
    return result.get("Trade", [])

def get_current_holdings(wallet_addresses: List[str], token_addresses: List[str]) -> List[Dict[str, Any]]:
    """Get current holdings for specific wallets and tokens"""
    # We need to get transfers for each token and calculate balances
    all_holdings = []
    
    for token_addr in token_addresses:
        query = """
        query GetTokenTransfers($tokenAddress: String!) {
            Transfer(
                where: {
                    token: {address: {_eq: $tokenAddress}}
                }
                order_by: {timestamp: asc}
            ) {
                from {
                    address
                }
                to {
                    address
                }
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
        transfers = result.get("Transfer", [])
        tokens = result.get("Token", [])
        
        if not tokens:
            continue
            
        token_info = tokens[0]
        
        # Calculate balances for this token
        balances = {}
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
                balances[to_addr] += amount
                last_updated[to_addr] = timestamp
        
        # Add holdings for wallets we're interested in
        for wallet_addr in wallet_addresses:
            if wallet_addr in balances and balances[wallet_addr] > 0:
                all_holdings.append({
                    'wallet': {'address': wallet_addr},
                    'token': token_info,
                    'currentBalance': str(balances[wallet_addr]),
                    'lastUpdated': str(last_updated.get(wallet_addr, 0))
                })
    
    return all_holdings

def analyze_also_bought(token_address: str) -> Dict[str, Any]:
    """
    Analyze what other tokens were bought by holders of the given token
    """
    print(f"🔍 Analyzing token: {token_address}")
    print("=" * 60)
    
    # Step 1: Get token info
    print("📋 Step 1: Getting token information...")
    try:
        token_info = get_token_info(token_address)
        print(f"   Token: {token_info.get('symbol', 'Unknown')} ({token_info.get('name', 'Unknown')})")
        print(f"   Address: {token_info['address']}")
        print(f"   Total Supply: {token_info.get('totalSupply', 'Unknown')}")
    except Exception as e:
        print(f"   ❌ Error getting token info: {e}")
        return {}
    
    # Step 2: Get current holders
    print("\n👥 Step 2: Getting current token holders...")
    try:
        holders = get_token_holders(token_address, min_balance=0)
        print(f"   Found {len(holders)} holders")
        
        if not holders:
            print("   ⚠️  No holders found for this token")
            return {"token": token_info, "holders": [], "trades": [], "also_bought": []}
            
        # Compute average hold time among current holders
        now_secs = int(datetime.now().timestamp())
        hold_durations = []
        for h in holders:
            try:
                first_acquired = int(h.get('firstAcquired', 0))
                if first_acquired > 0:
                    hold_durations.append(max(0, now_secs - first_acquired))
            except Exception:
                continue

        avg_hold_secs_current = int(sum(hold_durations) / max(len(hold_durations), 1)) if hold_durations else 0
        print(f"   📈 Avg hold time (current holders): {_format_duration(avg_hold_secs_current)} (based on {len(hold_durations)} holders)")
        
        # Show top holders
        sorted_holders = sorted(holders, key=lambda h: int(h['currentBalance']), reverse=True)
        print("\n   Top holders:")
        for i, holder in enumerate(sorted_holders[:5]):
            balance = int(holder['currentBalance'])
            print(f"   {i+1}. {holder['wallet']['address']}: {balance:,} tokens")
            
    except Exception as e:
        print(f"   ❌ Error getting holders: {e}")
        return {}
    
    # Step 3: Get trades from holders
    print("\n💹 Step 3: Getting trades from holders (last 24 hours)...")
    try:
        holder_addresses = [h['wallet']['address'] for h in holders]
        trades = get_wallet_trades(holder_addresses, hours_back=24)  # 24 hours
        
        # Filter trades to last 24 hours manually (since GraphQL filtering was removed)
        current_time = int(datetime.now().timestamp())
        recent_trades = []
        for trade in trades:
            trade_time = int(trade['timestamp'])
            if current_time - trade_time <= 24 * 3600:  # 24 hours in seconds
                recent_trades.append(trade)
        
        print(f"   Found {len(recent_trades)} trades from {len(holder_addresses)} holders in last 24 hours")
        
        if not recent_trades:
            print("   ⚠️  No trades found in last 24 hours")
            return {"token": token_info, "holders": holders, "trades": [], "also_bought": []}
        
        # Let's inspect the trading activity per wallet
        wallet_activity = {}
        for trade in recent_trades:
            wallet = trade['trader']['address']
            if wallet not in wallet_activity:
                wallet_activity[wallet] = {'trades': 0, 'buy': 0, 'sell': 0}
            wallet_activity[wallet]['trades'] += 1
            if trade['tradeType'] == 'BUY':
                wallet_activity[wallet]['buy'] += 1
            else:
                wallet_activity[wallet]['sell'] += 1
        
        print(f"\n   👤 Trading activity per wallet:")
        sorted_wallets = sorted(wallet_activity.items(), key=lambda x: x[1]['trades'], reverse=True)
        for wallet, activity in sorted_wallets[:10]:
            print(f"   - {wallet}: {activity['trades']} trades ({activity['buy']} buy, {activity['sell']} sell)")
        
        # Show timestamp analysis
        timestamps = [int(t['timestamp']) for t in recent_trades]
        oldest = min(timestamps)
        newest = max(timestamps)
        time_range = (newest - oldest) / 3600  # hours
        print(f"\n   ⏰ Time analysis:")
        print(f"   - Oldest trade: {datetime.fromtimestamp(oldest).strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"   - Newest trade: {datetime.fromtimestamp(newest).strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"   - Time range: {time_range:.1f} hours")
        print(f"   - Average: {len(recent_trades)/max(time_range, 0.1):.1f} trades per hour")
        
        # Add debug option to show individual trades
        if len(recent_trades) < 50:  # Only show if reasonable number
            print(f"\n   🔍 Recent trades (showing first 20):")
            for i, trade in enumerate(recent_trades[:20]):
                trade_time = datetime.fromtimestamp(int(trade['timestamp']))
                symbol = trade['token']['symbol'] or 'Unknown'
                wmon_amt = float(trade.get('monAmount', 0)) / (10**18)
                print(f"   {i+1:2d}. {trade_time.strftime('%H:%M:%S')} - {trade['trader']['address']} {trade['tradeType']} {symbol} ({wmon_amt:.4f} WMON)")
            
        # Analyze trades by type
        buy_trades = [t for t in recent_trades if t['tradeType'] == 'BUY']
        sell_trades = [t for t in recent_trades if t['tradeType'] == 'SELL']
        print(f"\n   📊 Trade breakdown:")
        print(f"   - {len(buy_trades)} BUY trades")
        print(f"   - {len(sell_trades)} SELL trades")
        
        # Find unique tokens bought with volume
        tokens_bought = {}
        for trade in buy_trades:
            token_addr = trade['token']['address']
            if token_addr == token_address:  # Skip the same token
                continue
                
            if token_addr not in tokens_bought:
                tokens_bought[token_addr] = {
                    'token': trade['token'],
                    'buyers': set(),
                    'wmon_volume': 0
                }
            
            trader_address = trade['trader']['address']
            if trader_address:  # Make sure it's not None
                tokens_bought[token_addr]['buyers'].add(trader_address)
            # Add WMON volume
            wmon_amount = int(trade.get('monAmount', 0))
            tokens_bought[token_addr]['wmon_volume'] += wmon_amount
        
        print(f"\n   📊 Found {len(tokens_bought)} different tokens bought by holders in last 24h:")
        for token_addr, data in list(tokens_bought.items())[:10]:
            symbol = data['token']['symbol'] or 'Unknown'
            unique_buyers = len(data['buyers'])
            wmon_volume = data['wmon_volume'] / (10**18)  # Convert from wei to WMON
            print(f"   - {symbol}: {unique_buyers} holders, {wmon_volume:.4f} WMON volume")
            
    except Exception as e:
        print(f"   ❌ Error getting trades: {e}")
        return {}
    
    # Step 3.5: Compute exited holders' average hold time and overall
    print("\n📦 Step 3.5: Computing exited holders' hold time and overall averages...")
    try:
        all_holdings = get_all_token_holdings(token_address)
        now_secs_overall = int(datetime.now().timestamp())
        current_durations: List[int] = []
        exited_durations: List[int] = []

        for h in all_holdings:
            try:
                first_acq = int(h.get('firstAcquired', 0))
                last_upd = int(h.get('lastUpdated', 0))
                curr_bal = int(h.get('currentBalance', 0))
            except Exception:
                continue

            if first_acq <= 0:
                continue

            if curr_bal > 0:
                current_durations.append(max(0, now_secs_overall - first_acq))
            else:
                # Holder exited; use duration until last update (assumed exit time)
                if last_upd > 0 and last_upd >= first_acq:
                    exited_durations.append(last_upd - first_acq)

        avg_hold_secs_exited = int(sum(exited_durations) / max(len(exited_durations), 1)) if exited_durations else 0
        # current_durations may be more precise than earlier; if empty, fall back to previously computed
        if not current_durations and holders:
            current_durations = [int(datetime.now().timestamp()) - int(h.get('firstAcquired', 0)) for h in holders if int(h.get('firstAcquired', 0)) > 0]
        avg_hold_secs_current_final = int(sum(current_durations) / max(len(current_durations), 1)) if current_durations else avg_hold_secs_current

        combined = current_durations + exited_durations
        avg_hold_secs_overall = int(sum(combined) / max(len(combined), 1)) if combined else 0

        print(f"   📊 Avg hold time (exited holders): {_format_duration(avg_hold_secs_exited)} (based on {len(exited_durations)} holders)")
        print(f"   🧮 Avg hold time (overall): {_format_duration(avg_hold_secs_overall)} (based on {len(combined)} holders)")
    except Exception as e:
        print(f"   ❌ Error computing exited/overall averages: {e}")
        avg_hold_secs_exited = 0
        avg_hold_secs_overall = avg_hold_secs_current
        avg_hold_secs_current_final = avg_hold_secs_current

    # Step 4: Check which tokens are still held (simple: if holding > 0, count as also-bought)
    print("\n🔒 Step 4: Checking which bought tokens are still held...")
    try:
        if tokens_bought:
            token_addresses_bought = list(tokens_bought.keys())
            current_holdings = get_current_holdings(holder_addresses, token_addresses_bought)
            
            # Create a set of tokens that are currently held
            currently_held_tokens = set()
            for holding in current_holdings:
                if int(holding['currentBalance']) > 0:
                    currently_held_tokens.add(holding['token']['address'])
            
            print(f"   Found {len(currently_held_tokens)} tokens still being held out of {len(tokens_bought)} bought")
            
            # Create final results - only tokens that are still held
            also_bought = []
            for token_addr, bought_data in tokens_bought.items():
                if token_addr in currently_held_tokens:
                    buyers_count = len(bought_data['buyers'])
                    wmon_volume = bought_data['wmon_volume'] / (10**18)  # Convert to WMON
                    
                    also_bought.append({
                        'token': bought_data['token'],
                        'holders_count': buyers_count,
                        'wmon_volume': wmon_volume
                    })
            
            # Sort by WMON volume (highest first), then by number of holders
            also_bought.sort(key=lambda x: (x['wmon_volume'], x['holders_count']), reverse=True)
            
            print(f"\n   🎯 Also-bought tokens (still held, sorted by WMON volume, then holders):")
            for i, item in enumerate(also_bought[:5], 1):
                symbol = item['token']['symbol'] or 'Unknown'
                print(f"   {i}. {symbol}: {item['holders_count']} holders, {item['wmon_volume']:.4f} WMON volume")
        else:
            also_bought = []
            
    except Exception as e:
        print(f"   ❌ Error checking holdings: {e}")
        return {}
    
    print("\n✅ Analysis complete!")
    
    return {
        "token": token_info,
        "holders": holders,
        "trades": trades,
        "also_bought": also_bought,
        "avg_hold_time_seconds_current": avg_hold_secs_current_final,
        "avg_hold_time_formatted_current": _format_duration(avg_hold_secs_current_final),
        "avg_hold_time_seconds_exited": avg_hold_secs_exited,
        "avg_hold_time_formatted_exited": _format_duration(avg_hold_secs_exited),
        "avg_hold_time_seconds_overall": avg_hold_secs_overall,
        "avg_hold_time_formatted_overall": _format_duration(avg_hold_secs_overall)
    }

def main():
    parser = argparse.ArgumentParser(description='Analyze token holder behavior and also-bought patterns')
    parser.add_argument('--token', required=True, help='Token address to analyze')
    parser.add_argument('--debug', action='store_true', help='Show detailed trade information for debugging')
    
    args = parser.parse_args()
    
    try:
        result = analyze_also_bought(args.token)
        
        if result.get('also_bought'):
            print(f"\n🏆 SUMMARY: Token holders also bought {len(result['also_bought'])} other tokens they still hold")
        else:
            print(f"\n📝 SUMMARY: No other tokens found that are still held by this token's holders")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())