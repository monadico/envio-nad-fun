!/usr/bin/env python3
import os
import json
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, HttpUrl


DEFAULT_ENDPOINT = (
    os.getenv(
        "ENVIO_ENDPOINT",
        "https://indexer.dev.hyperindex.xyz/01c5727/v1/graphql",
    )
)


def query_graphql(endpoint: str, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    payload = {"query": query, "variables": variables or {}}
    try:
        resp = requests.post(endpoint, json=payload, timeout=30)
        resp.raise_for_status()
        body = resp.json()
        if "errors" in body:
            raise HTTPException(status_code=502, detail={"endpoint": endpoint, "errors": body["errors"]})
        return body["data"]
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail={"endpoint": endpoint, "error": str(e)})


def _format_duration(seconds: int) -> str:
    days = seconds // 86400
    hours = (seconds % 86400) // 3600
    minutes = (seconds % 3600) // 60
    if days > 0:
        return f"{days}d {hours}h"
    if hours > 0:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"


def get_token_info(endpoint: str, token_address: str) -> Dict[str, Any]:
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
    data = query_graphql(endpoint, query, {"tokenAddress": token_address})
    tokens = data.get("Token", [])
    if not tokens:
        raise HTTPException(status_code=404, detail=f"Token {token_address} not found")
    return tokens[0]


def get_token_holders(endpoint: str, token_address: str) -> List[Dict[str, Any]]:
    query = """
    query GetTokenHolders($tokenAddress: String!) {
        TokenHolding(
            where: { token: {address: {_eq: $tokenAddress}}, currentBalance: {_gt: "0"} }
        ) {
            wallet { address }
            currentBalance
            lastUpdated
            firstAcquired
        }
    }
    """
    data = query_graphql(endpoint, query, {"tokenAddress": token_address})
    return data.get("TokenHolding", [])


def get_all_token_holdings(endpoint: str, token_address: str) -> List[Dict[str, Any]]:
    query = """
    query GetAllTokenHoldings($tokenAddress: String!) {
        TokenHolding(where: { token: {address: {_eq: $tokenAddress}} }) {
            wallet { address }
            currentBalance
            previousBalance
            firstAcquired
            lastUpdated
        }
    }
    """
    data = query_graphql(endpoint, query, {"tokenAddress": token_address})
    return data.get("TokenHolding", [])


def get_wallet_trades(endpoint: str, wallet_addresses: List[str]) -> List[Dict[str, Any]]:
    query = """
    query GetWalletTrades($walletAddresses: [String!]!) {
        Trade(where: { trader: {address: {_in: $walletAddresses}} }) {
            id
            token { address symbol name }
            trader { address }
            tradeType
            tokenAmount
            monAmount
            timestamp
            txHash
        }
    }
    """
    data = query_graphql(endpoint, query, {"walletAddresses": wallet_addresses})
    return data.get("Trade", [])


def get_current_holdings(endpoint: str, wallet_addresses: List[str], token_addresses: List[str]) -> List[Dict[str, Any]]:
    query = """
    query GetCurrentHoldings($walletAddresses: [String!]!, $tokenAddresses: [String!]!) {
        TokenHolding(
            where: {
                wallet: {address: {_in: $walletAddresses}},
                token: {address: {_in: $tokenAddresses}},
                currentBalance: {_gt: "0"}
            }
        ) {
            wallet { address }
            token { address symbol name }
            currentBalance
            lastUpdated
        }
    }
    """
    data = query_graphql(endpoint, query, {"walletAddresses": wallet_addresses, "tokenAddresses": token_addresses})
    return data.get("TokenHolding", [])


def analyze_token(endpoint: str, token_address: str) -> Dict[str, Any]:
    token_info = get_token_info(endpoint, token_address)

    holders = get_token_holders(endpoint, token_address)
    now_secs = int(datetime.now().timestamp())

    # Average hold time for current holders
    current_durations: List[int] = []
    for h in holders:
        try:
            first_acq = int(h.get("firstAcquired", 0))
            if first_acq > 0:
                current_durations.append(max(0, now_secs - first_acq))
        except Exception:
            continue
    avg_hold_current = int(sum(current_durations) / max(len(current_durations), 1)) if current_durations else 0

    # Exited and overall
    all_holdings = get_all_token_holdings(endpoint, token_address)
    exited_durations: List[int] = []
    for h in all_holdings:
        try:
            first_acq = int(h.get("firstAcquired", 0))
            last_upd = int(h.get("lastUpdated", 0))
            curr_bal = int(h.get("currentBalance", 0))
        except Exception:
            continue
        if first_acq <= 0:
            continue
        if curr_bal == 0 and last_upd >= first_acq:
            exited_durations.append(last_upd - first_acq)

    avg_hold_exited = int(sum(exited_durations) / max(len(exited_durations), 1)) if exited_durations else 0
    combined = current_durations + exited_durations
    avg_hold_overall = int(sum(combined) / max(len(combined), 1)) if combined else 0

    # Recent trades for activity context (24h)
    holder_addresses = [h["wallet"]["address"] for h in holders]
    trades = get_wallet_trades(endpoint, holder_addresses) if holder_addresses else []
    cutoff = int((datetime.now() - timedelta(hours=24)).timestamp())
    recent_trades = [t for t in trades if int(t.get("timestamp", 0)) >= cutoff]

    # Also-bought analysis limited to current holders and 24h window
    buy_trades = [t for t in recent_trades if t.get("tradeType") == "BUY" and t["token"]["address"].lower() != token_address.lower()]
    tokens_bought: Dict[str, Dict[str, Any]] = {}
    for t in buy_trades:
        addr = t["token"]["address"]
        entry = tokens_bought.setdefault(addr, {"token": t["token"], "buyers": set(), "wmon_volume": 0})
        entry["buyers"].add(t["trader"]["address"])
        try:
            entry["wmon_volume"] += int(t.get("monAmount", 0))
        except Exception:
            pass

    current_holdings = get_current_holdings(endpoint, holder_addresses, list(tokens_bought.keys())) if tokens_bought else []
    currently_held = {h["token"]["address"] for h in current_holdings if int(h.get("currentBalance", 0)) > 0}

    also_bought: List[Dict[str, Any]] = []
    for addr, data in tokens_bought.items():
        if addr in currently_held:
            also_bought.append({
                "token": data["token"],
                "holders_count": len(data["buyers"]),
                "wmon_volume": data["wmon_volume"] / (10 ** 18),
            })
    also_bought.sort(key=lambda x: (x["wmon_volume"], x["holders_count"]), reverse=True)

    return {
        "token": token_info,
        "metrics": {
            "avg_hold_time_seconds_current": avg_hold_current,
            "avg_hold_time_formatted_current": _format_duration(avg_hold_current),
            "avg_hold_time_seconds_exited": avg_hold_exited,
            "avg_hold_time_formatted_exited": _format_duration(avg_hold_exited),
            "avg_hold_time_seconds_overall": avg_hold_overall,
            "avg_hold_time_formatted_overall": _format_duration(avg_hold_overall),
        },
        "holders_count": len(holders),
        "also_bought": also_bought,
    }


class AnalyzeRequest(BaseModel):
    token: str = Field(..., description="Token address to analyze")
    endpoint: Optional[HttpUrl] = Field(None, description="Override GraphQL endpoint")


app = FastAPI(title="Token Analysis API", version="1.0.0")


@app.post("/analyze")
def analyze(req: AnalyzeRequest) -> Dict[str, Any]:
    endpoint = str(req.endpoint) if req.endpoint else DEFAULT_ENDPOINT
    return analyze_token(endpoint, req.token)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "9000")),
        reload=False,
    )