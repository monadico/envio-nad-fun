# Schema Comparison: Nad.fun Analytics GraphQL APIs

This document compares the database schemas of three different Nad.fun analytics GraphQL endpoints, highlighting their differences and evolution.

## Overview

| Endpoint | Purpose | Type | Status |
|----------|---------|------|--------|
| `https://indexer.dev.hyperindex.xyz/5300d58/v1/graphql` | Holdings & Analytics API | Full-featured | Production |
| `https://indexer.hyperindex.xyz/2fe958e/v1/graphql` | Trading Data API | Trade-focused | Production |
| `http://localhost:8080/v1/graphql` | **Our Unified API** | **Next-gen unified** | **Development** |

---

## Schema Details

### 1. Holdings API (`5300d58`) - Full Featured

#### **Token Entity**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String | ✅ | Primary key - token address |
| `address` | String | ✅ | Token contract address |
| `name` | String | ❌ | Token name |
| `symbol` | String | ❌ | Token symbol |
| `creator_id` | String | ❌ | Foreign key to Wallet |
| `totalSupply` | numeric | ❌ | Total token supply |
| `creationTimestamp` | numeric | ❌ | Unix timestamp |
| `db_write_timestamp` | timestamp | ❌ | Database write time |

**Relationships:**
- `creator` → Wallet
- `holdings` → [TokenHolding]
- `trades` → [Trade]  
- `transfers` → [Transfer]

#### **TokenHolding Entity** ✅
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String | ✅ | Primary key |
| `wallet_id` | String | ✅ | Foreign key to Wallet |
| `token_id` | String | ✅ | Foreign key to Token |
| `currentBalance` | numeric | ✅ | Current token balance |
| `previousBalance` | numeric | ✅ | Previous balance |
| `firstAcquired` | numeric | ✅ | First acquisition timestamp |
| `lastUpdated` | numeric | ✅ | Last update timestamp |
| `db_write_timestamp` | timestamp | ❌ | Database write time |

#### **Trade Entity**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String | ✅ | Primary key |
| `token_id` | String | ✅ | Foreign key to Token |
| `trader_id` | String | ✅ | Foreign key to Wallet |
| `tradeType` | String | ✅ | "BUY" or "SELL" |
| `source` | String | ✅ | Trade source |
| `tokenAmount` | numeric | ✅ | Amount of tokens |
| `monAmount` | numeric | ✅ | Amount of MON |
| `blockNumber` | numeric | ✅ | Block number |
| `timestamp` | numeric | ✅ | Unix timestamp |
| `txHash` | String | ✅ | Transaction hash |

#### **Transfer Entity**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String | ✅ | Primary key |
| `token_id` | String | ✅ | Foreign key to Token |
| `from_id` | String | ✅ | Foreign key to Wallet (sender) |
| `to_id` | String | ✅ | Foreign key to Wallet (receiver) |
| `amount` | numeric | ✅ | Transfer amount |
| `blockNumber` | numeric | ✅ | Block number |
| `timestamp` | numeric | ✅ | Unix timestamp |
| `txHash` | String | ✅ | Transaction hash |

#### **Wallet Entity**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String | ✅ | Primary key - wallet address |
| `address` | String | ✅ | Wallet address |
| `db_write_timestamp` | timestamp | ❌ | Database write time |

**Relationships:**
- `holdings` → [TokenHolding] ✅
- `trades` → [Trade]
- `transfersFrom` → [Transfer]
- `transfersTo` → [Transfer]

---

### 2. Trading API (`2fe958e`) - Trade Focused

#### **Token Entity**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String | ✅ | Primary key - token address |
| `address` | String | ✅ | Token contract address |
| `name` | String | ❌ | Token name |
| `symbol` | String | ❌ | Token symbol |
| `creator_id` | String | ❌ | Foreign key to Wallet |
| `totalSupply` | numeric | ❌ | Total token supply |
| `creationTimestamp` | numeric | ❌ | Unix timestamp |

**Relationships:**
- `creator` → Wallet
- `trades` → [Trade]
- `transfers` → [Transfer]

#### **TokenHolding Entity** ❌ 
**MISSING - This API does not support holdings tracking**

#### **Trade Entity** ✅ (Same as Holdings API)
#### **Transfer Entity** ✅ (Same as Holdings API)

#### **Wallet Entity**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String | ✅ | Primary key - wallet address |
| `address` | String | ✅ | Wallet address |

**Relationships:**
- `trades` → [Trade]
- `transfersFrom` → [Transfer]  
- `transfersTo` → [Transfer]
- ❌ **No `holdings` relationship** - missing TokenHolding support

---

### 3. Our Unified API (localhost) - Next Generation

#### **Token Entity**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String | ✅ | Primary key - token address |
| `address` | String | ✅ | Token contract address |
| `name` | String | ❌ | Token name |
| `symbol` | String | ❌ | Token symbol |
| `creator_id` | String | ❌ | Foreign key to Wallet |
| `poolAddress` | String | ❌ | **🆕 Uniswap V3 pool address** |
| `totalSupply` | BigInt | ❌ | Total token supply |
| `creationTimestamp` | BigInt | ❌ | Unix timestamp |

**Relationships:**
- `creator` → Wallet
- `holdings` → [TokenHolding]
- `trades` → [Trade]
- `transfers` → [Transfer]

#### **TokenHolding Entity** ✅
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String | ✅ | Primary key (wallet_id + "-" + token_id) |
| `wallet_id` | String | ✅ | Foreign key to Wallet |
| `token_id` | String | ✅ | Foreign key to Token |
| `currentBalance` | BigInt | ✅ | Current token balance |
| `previousBalance` | BigInt | ✅ | Previous balance |
| `firstAcquired` | BigInt | ✅ | First acquisition timestamp |
| `lastUpdated` | BigInt | ✅ | Last update timestamp |

#### **Trade Entity**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String | ✅ | Primary key |
| `token_id` | String | ✅ | Foreign key to Token |
| `trader_id` | String | ✅ | Foreign key to Wallet |
| `tradeType` | String | ✅ | "BUY" or "SELL" |
| `source` | String | ✅ | **🆕 Enhanced: "Bonding Curve", "DEXRouter", "Monorail", "Uniswap"** |
| `tokenAmount` | BigInt | ✅ | Amount of tokens |
| `monAmount` | BigInt | ✅ | Amount of MON |
| `blockNumber` | BigInt | ✅ | Block number |
| `timestamp` | BigInt | ✅ | Unix timestamp |
| `txHash` | String | ✅ | Transaction hash |

#### **Transfer Entity** ✅ (Enhanced with BigInt types)
#### **Wallet Entity** ✅ (Complete with all relationships)

---

## Key Differences Summary

### **API Capabilities**

| Feature | Holdings API (`5300d58`) | Trading API (`2fe958e`) | **Our Unified API** |
|---------|-------------------------|-------------------------|-------------------|
| **Token Management** | ✅ Complete | ✅ Complete | ✅ **Enhanced** |
| **Holdings Tracking** | ✅ **Full featured** | ❌ **Missing entirely** | ✅ **Full featured** |
| **Trade Analytics** | ✅ Complete | ✅ Complete | ✅ **Enhanced sources** |
| **Transfer Tracking** | ✅ Complete | ✅ Complete | ✅ Complete |
| **Wallet Management** | ✅ With holdings | ✅ Basic only | ✅ **Complete** |
| **Uniswap Integration** | ❌ Missing | ❌ Missing | ✅ **🆕 Native support** |
| **Duplicate Prevention** | ❌ Not mentioned | ❌ Not mentioned | ✅ **🆕 Built-in** |
| **API Unification** | ❌ Split functionality | ❌ Split functionality | ✅ **🆕 Single endpoint** |

### **Data Type Evolution**

| Field Type | Holdings API | Trading API | Our API | Advantage |
|------------|-------------|-------------|---------|-----------|
| **Numeric Fields** | `numeric` | `numeric` | `BigInt` | **Better precision** |
| **ID Strategy** | String | String | String | **Consistent** |
| **Timestamps** | Unix numeric | Unix numeric | Unix BigInt | **Better precision** |

### **Trade Sources Evolution**

| API | Supported Sources | Count |
|-----|------------------|-------|
| **Holdings API (`5300d58`)** | Unknown (from schema) | ? |
| **Trading API (`2fe958e`)** | Unknown (from schema) | ? |
| **Our Unified API** | "Bonding Curve", "DEXRouter", "Monorail", "Uniswap" | **4 sources** |

### **Unique Features**

#### **Holdings API (`5300d58`) Exclusive:**
- ✅ TokenHolding entity with full history tracking
- ✅ Wallet holdings relationships

#### **Trading API (`2fe958e`) Exclusive:**  
- 🔹 Focused, lightweight trading-only queries
- 🔹 No holdings overhead

#### **Our Unified API Exclusive:**
- 🆕 **`Token.poolAddress`** - Uniswap V3 pool integration
- 🆕 **Enhanced trade sources** - 4 different trading venues
- 🆕 **Duplicate prevention** - Built-in transaction deduplication  
- 🆕 **Unified endpoint** - No need for multiple API calls
- 🆕 **BigInt precision** - Better handling of large numbers
- 🆕 **Complete relationships** - All entities properly connected

---

## Frontend Integration Comparison

### **Current Nad.fun-Pro Pattern (2 APIs needed):**
```typescript
// Holdings data
const holdersResponse = await fetch('https://indexer.dev.hyperindex.xyz/5300d58/v1/graphql', {
  method: 'POST',
  body: JSON.stringify({ query: holdingsQuery })
});

// Trading data  
const tradesResponse = await fetch('https://indexer.hyperindex.xyz/2fe958e/v1/graphql', {
  method: 'POST', 
  body: JSON.stringify({ query: tradesQuery })
});
```

### **With Our Unified API (1 API needed):**
```typescript
// All data in one call
const allDataResponse = await fetch('http://localhost:8080/v1/graphql', {
  method: 'POST',
  body: JSON.stringify({ 
    query: `{
      Token(where: {id: {_eq: $tokenAddress}}) {
        id name symbol poolAddress
        holdings { wallet_id currentBalance }
        trades { tradeType source monAmount }
        transfers { amount from_id to_id }
      }
    }`
  })
});
```

---

## Migration Benefits

### **For Frontend Developers:**
- ✅ **Reduced API complexity** - Single endpoint vs dual endpoints
- ✅ **Better performance** - Fewer network requests
- ✅ **Enhanced features** - Uniswap integration, more trade sources
- ✅ **Better data consistency** - All data from single source
- ✅ **Built-in duplicate prevention** - Cleaner analytics

### **For Analytics:**
- ✅ **Complete picture** - Holdings + trades + transfers in one query
- ✅ **Uniswap insights** - Track pool-based trading
- ✅ **Enhanced trade attribution** - 4 different sources tracked
- ✅ **Historical precision** - Better timestamp and amount precision

### **For System Architecture:**
- ✅ **Simplified deployment** - One indexer vs two
- ✅ **Better caching** - Single endpoint to cache
- ✅ **Reduced latency** - No cross-API joins needed
- ✅ **Enhanced reliability** - No single points of failure across APIs

---

## Conclusion

Our unified API represents the **next evolution** of Nad.fun analytics infrastructure:

1. **Combines the best** of both existing production APIs
2. **Eliminates limitations** (missing TokenHolding, split endpoints)  
3. **Adds new capabilities** (Uniswap integration, enhanced sources)
4. **Improves developer experience** (single endpoint, better types)
5. **Enhances data quality** (duplicate prevention, precision)

**Migration Path:** Frontend applications can switch from the dual-API pattern to our unified API for better performance, features, and maintainability.