-- Script to selectively delete and reprocess only Uniswap trades
-- This keeps all other data (tokens, wallets, bonding curve trades, etc.)

-- 1. First, let's see what we're working with
SELECT 
    source,
    COUNT(*) as trade_count,
    SUM(CAST("monAmount" AS NUMERIC)) / 1e18 as total_volume_mon
FROM "public"."Trade" 
GROUP BY source 
ORDER BY trade_count DESC;

-- 2. Delete only Uniswap trades (these have the inverted data)
DELETE FROM "public"."Trade" 
WHERE source = 'Uniswap';

-- 3. Show remaining trades to confirm
SELECT 
    source,
    COUNT(*) as remaining_trades
FROM "public"."Trade" 
GROUP BY source 
ORDER BY remaining_trades DESC;