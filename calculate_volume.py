#!/usr/bin/env python3
"""
Volume Calculator Script for Nadfun Analytics
Calculates total, buy, and sell volumes for a given token using GraphQL API
"""

import json
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Any


# Configuration
GRAPHQL_ENDPOINT = "http://localhost:8080/v1/graphql"
TOKEN_ADDRESS = "0xb470f063ff49F2a416a5150DaaAA76aD0B5E6838"


def get_timestamp_for_timeframe(timeframe: str) -> int:
    """Calculate timestamp for given timeframe"""
    now = int(datetime.now().timestamp())
    
    timeframes = {
        '5min': 5 * 60,
        '1h': 60 * 60,
        '6h': 6 * 60 * 60,
        '24h': 24 * 60 * 60,
        '7d': 7 * 24 * 60 * 60,
        '30d': 30 * 24 * 60 * 60,
        'all': 0  # Get all trades
    }
    
    seconds_back = timeframes.get(timeframe, 24 * 60 * 60)  # Default to 24h
    return now - seconds_back if seconds_back > 0 else 0


def fetch_trades(token_address: str, timeframe: str = '24h') -> List[Dict[str, Any]]:
    """Fetch trades from GraphQL API"""
    from_timestamp = get_timestamp_for_timeframe(timeframe)
    
    query = {
        "query": """
        query GetTrades($token_id: String!, $from_ts: numeric!) { 
            Trade(where: { 
                token_id: { _eq: $token_id }, 
                timestamp: { _gte: $from_ts } 
            }, order_by: { timestamp: desc }) { 
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
        """,
        "variables": {
            "token_id": token_address,
            "from_ts": from_timestamp
        }
    }
    
    print(f"Fetching trades for token: {token_address}")
    print(f"Timeframe: {timeframe} (from timestamp: {from_timestamp})")
    print(f"GraphQL endpoint: {GRAPHQL_ENDPOINT}")
    
    try:
        response = requests.post(
            GRAPHQL_ENDPOINT,
            json=query,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        response.raise_for_status()
        
        data = response.json()
        
        if 'errors' in data:
            print(f"GraphQL errors: {data['errors']}")
            return []
            
        trades = data.get('data', {}).get('Trade', [])
        print(f"Fetched {len(trades)} trades")
        return trades
        
    except requests.RequestException as e:
        print(f"Request error: {e}")
        return []
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        return []


def calculate_volume(trades: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate volume metrics from trades"""
    if not trades:
        return {
            'total_trades': 0,
            'buy_trades': 0,
            'sell_trades': 0,
            'total_volume_wei': 0,
            'buy_volume_wei': 0,
            'sell_volume_wei': 0,
            'total_volume_mon': 0.0,
            'buy_volume_mon': 0.0,
            'sell_volume_mon': 0.0,
            'avg_trade_size_mon': 0.0,
            'largest_trade_mon': 0.0,
            'buy_pressure_percent': 0.0,
            'sell_pressure_percent': 0.0
        }
    
    # Debug: Print first few trades to see the actual data with tx hashes
    print(f"\nDEBUG: First 5 trades:")
    for i, trade in enumerate(trades[:5]):
        tx_hash = trade.get('txHash', 'N/A')
        print(f"  Trade {i+1}: {trade.get('tradeType')} - TxHash: {tx_hash} - Source: {trade.get('source', 'N/A')} - monAmount: {trade.get('monAmount')} - tokenAmount: {trade.get('tokenAmount')}")
    
    # Separate trades by type
    buy_trades = [t for t in trades if t.get('tradeType', '').upper() == 'BUY']
    sell_trades = [t for t in trades if t.get('tradeType', '').upper() == 'SELL']
    
    print(f"\nDEBUG: Buy trades sample:")
    for i, trade in enumerate(buy_trades[:3]):
        mon_amount = trade.get('monAmount', '0')
        tx_hash = trade.get('txHash', 'N/A')
        source = trade.get('source', 'N/A')
        print(f"  Buy {i+1}: TxHash={tx_hash} - Source={source} - monAmount={mon_amount} -> {float(mon_amount)/1e18:.6f} MON")
    
    print(f"\nDEBUG: Sell trades sample:")
    for i, trade in enumerate(sell_trades[:3]):
        mon_amount = trade.get('monAmount', '0')
        tx_hash = trade.get('txHash', 'N/A')
        source = trade.get('source', 'N/A')
        print(f"  Sell {i+1}: TxHash={tx_hash} - Source={source} - monAmount={mon_amount} -> {float(mon_amount)/1e18:.6f} MON")
    
    # Calculate volumes in wei
    buy_volume_wei = sum(int(t.get('monAmount', '0')) for t in buy_trades)
    sell_volume_wei = sum(int(t.get('monAmount', '0')) for t in sell_trades)
    total_volume_wei = buy_volume_wei + sell_volume_wei
    
    # Convert to MON (divide by 1e18)
    buy_volume_mon = buy_volume_wei / 1e18
    sell_volume_mon = sell_volume_wei / 1e18
    total_volume_mon = total_volume_wei / 1e18
    
    # Calculate additional metrics
    avg_trade_size_mon = total_volume_mon / len(trades) if trades else 0.0
    
    # Find largest trade
    largest_trade_mon = 0.0
    if trades:
        largest_trade_wei = max(int(t.get('monAmount', '0')) for t in trades)
        largest_trade_mon = largest_trade_wei / 1e18
    
    # Calculate buy/sell pressure
    buy_pressure = (buy_volume_mon / total_volume_mon * 100) if total_volume_mon > 0 else 0.0
    sell_pressure = 100.0 - buy_pressure
    
    return {
        'total_trades': len(trades),
        'buy_trades': len(buy_trades),
        'sell_trades': len(sell_trades),
        'total_volume_wei': total_volume_wei,
        'buy_volume_wei': buy_volume_wei,
        'sell_volume_wei': sell_volume_wei,
        'total_volume_mon': total_volume_mon,
        'buy_volume_mon': buy_volume_mon,
        'sell_volume_mon': sell_volume_mon,
        'avg_trade_size_mon': avg_trade_size_mon,
        'largest_trade_mon': largest_trade_mon,
        'buy_pressure_percent': buy_pressure,
        'sell_pressure_percent': sell_pressure
    }


def format_volume(volume: float) -> str:
    """Format volume with appropriate suffixes"""
    if volume >= 1_000_000:
        return f"{volume / 1_000_000:.2f}M MON"
    elif volume >= 1_000:
        return f"{volume / 1_000:.2f}K MON"
    else:
        return f"{volume:.2f} MON"


def print_volume_report(metrics: Dict[str, Any], timeframe: str):
    """Print formatted volume report"""
    print("\n" + "="*60)
    print(f"VOLUME REPORT - {timeframe.upper()}")
    print("="*60)
    
    print(f"Token: {TOKEN_ADDRESS}")
    print(f"Total Trades: {metrics['total_trades']:,}")
    print(f"  • Buy Trades: {metrics['buy_trades']:,}")
    print(f"  • Sell Trades: {metrics['sell_trades']:,}")
    
    print(f"\nVolume (MON):")
    print(f"  • Total Volume: {format_volume(metrics['total_volume_mon'])}")
    print(f"  • Buy Volume:   {format_volume(metrics['buy_volume_mon'])}")
    print(f"  • Sell Volume:  {format_volume(metrics['sell_volume_mon'])}")
    
    print(f"\nVolume (Wei - Raw):")
    print(f"  • Total: {metrics['total_volume_wei']:,}")
    print(f"  • Buy:   {metrics['buy_volume_wei']:,}")
    print(f"  • Sell:  {metrics['sell_volume_wei']:,}")
    
    print(f"\nMetrics:")
    print(f"  • Average Trade Size: {format_volume(metrics['avg_trade_size_mon'])}")
    print(f"  • Largest Trade: {format_volume(metrics['largest_trade_mon'])}")
    print(f"  • Buy Pressure: {metrics['buy_pressure_percent']:.1f}%")
    print(f"  • Sell Pressure: {metrics['sell_pressure_percent']:.1f}%")
    
    print("="*60)


def main():
    """Main function"""
    print("Nadfun Analytics - Volume Calculator")
    print("====================================")
    
    # Available timeframes
    timeframes = ['5min', '1h', '6h', '24h', '7d', '30d', 'all']
    
    print("\nAvailable timeframes:", ", ".join(timeframes))
    
    # You can modify this to accept command line arguments or input
    timeframe = 'all'  # Default timeframe - show all trades to see what's available
    
    # Fetch trades
    trades = fetch_trades(TOKEN_ADDRESS, timeframe)
    
    if not trades:
        print("No trades found or error fetching data.")
        return
    
    # Calculate volume metrics
    metrics = calculate_volume(trades)
    
    # Print report
    print_volume_report(metrics, timeframe)
    
    # Optional: Save to JSON file
    output_file = f"volume_report_{TOKEN_ADDRESS}_{timeframe}.json"
    with open(output_file, 'w') as f:
        json.dump({
            'token_address': TOKEN_ADDRESS,
            'timeframe': timeframe,
            'timestamp': datetime.now().isoformat(),
            'metrics': metrics,
            'raw_trades_count': len(trades)
        }, f, indent=2)
    
    print(f"\nDetailed report saved to: {output_file}")


if __name__ == "__main__":
    main()