# Tomodachi Shoes — API Documentation

**Base URL**: `http://localhost:4321/api`

## Endpoints

### `GET /api/shoes` — List shoes

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 24 | Items per page (max 100) |
| `q` | string | — | Full-text search query |
| `rarity` | string | — | Filter: COMMON, LIMITED, RARE, LEGENDARY, MYTHIC |
| `category` | string | — | Filter: speed, tech, limited, archive, collab |
| `region` | string | — | Filter: JP-TOKYO, JP-OSAKA, KR-SEOUL, etc |
| `status` | string | — | Filter: ACTIVE, ARCHIVED, PENDING |
| `minPrice` | int | — | Minimum price filter |
| `maxPrice` | int | — | Maximum price filter |
| `featured` | bool | — | Featured items only |
| `collection` | string | — | Collection ObjectId |
| `sort` | string | -createdAt | Sort field (prefix `-` for desc) |

**Response:**
```json
{
  "data": [ { ...shoe } ],
  "pagination": {
    "page": 1,
    "limit": 24,
    "total": 7500,
    "totalPages": 313,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### `GET /api/shoes/:id` — Single shoe

Returns full shoe dossier including market data, release info, images, 3D models, specs.

---

### `PUT /api/shoes/:id` — Update shoe

Update any field. Supports partial updates.

---

### `DELETE /api/shoes/:id` — Archive shoe

Soft-delete: sets `isActive: false`, `isArchived: true`, `market.status: ARCHIVED`.

---

### `GET /api/shoes/search` — Meilisearch-powered search

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | "" | Search query |
| `page` | int | 1 | Page number |
| `limit` | int | 24 | Items per page |
| `rarity` | string | — | Filter |
| `category` | string | — | Filter |
| `region` | string | — | Filter |
| `sort` | string | — | e.g. `price:asc`, `-price:desc` |

Falls back to MongoDB text search if Meilisearch is unavailable.

---

### `GET /api/collections` — List collections

**Query Parameters:** `page`, `limit`, `featured`, `year`

---

### `GET /api/market` — Market overview

Returns aggregate stats: total shoes, market cap, rarity distribution, region distribution, top demand items, average price/volatility.

---

### `POST /api/market/seed` — Seed database

**Body:**
```json
{
  "count": 10000,
  "startId": 1,
  "clearExisting": false,
  "imageDir": "./assets/images"
}
```

Generates `count` shoes with seeded market data (¥89万〜400万). Scans image directory for product images. Creates collections. Indexes in Meilisearch.

---

### `POST /api/import/batch` — Batch import

**Body:**
```json
{
  "imageDir": "./assets/images",
  "batchSize": 100,
  "startIndex": 0,
  "uploadToCDN": false
}
```

Scans image directory, creates shoe records with market data. Optionally uploads to Cloudinary CDN.

---

## Data Model: Shoe Document

```json
{
  "_id": "ObjectId",
  "name": "UNIT 0001",
  "slug": "unit-0001",
  "sku": "TM-000001",
  "jpLabel": "速度",
  "description": "...",
  "jpDescription": "...",

  "images": [{
    "url": "https://cdn...",
    "secureUrl": "https://...",
    "publicId": "tomodachi/shoes/unit-0001/main",
    "width": 1200, "height": 1200,
    "format": "webp", "bytes": 85000,
    "thumbnailUrl": "...",
    "webpUrl": "...",
    "avifUrl": "...",
    "variant": "main",
    "alt": "UNIT 0001"
  }],

  "primaryImage": { ... },

  "market": {
    "price": 2450000,
    "priceFormatted": "¥2,450,000",
    "resaleValue": 4150000,
    "resaleFormatted": "¥4,150,000",
    "rarity": "RARE",
    "rarityScore": 72,
    "volatility": 0.12,
    "trend": "bullish",
    "stock": 12,
    "status": "ACTIVE",
    "region": "JP-TOKYO",
    "category": "tech",
    "series": "NEO TOKYO",
    "energyClass": "A+",
    "marketCap": 29400000,
    "lastSaleChange": 0.034,
    "demandIndex": 87
  },

  "release": {
    "date": "2024-06-15",
    "season": "SUMMER",
    "year": 2024,
    "dropNumber": 27,
    "isExclusive": true,
    "regionLock": ["JP-TOKYO"]
  },

  "collectionId": "ObjectId",
  "tags": ["rare", "tech", "jp-tokyo"],
  "designer": "Yamamoto",
  "colorways": ["BLACK/MATTE"],
  "materials": ["FLYKNIT", "TPU"],
  "technology": ["AIR ZOOM", "CARBON PLATE"],
  "weight": 220, "weightUnit": "g",
  "origin": "JAPAN",
  "energyClass": "A+",
  "isActive": true,
  "isFeatured": true,
  "viewCount": 1847,
  "favoriteCount": 93
}
```

---

## Price System

All prices are generated using a seeded deterministic algorithm:

- **Range**: ¥890,000 (89万) ~ ¥4,000,000 (400万)
- **Rarity tiers**: COMMON → LIMITED → RARE → LEGENDARY → MYTHIC
- **Resale multiplier**: 0.9× (COMMON) up to 7.0× (MYTHIC)
- **Volatility**: 2% ~ 37% per item
- **Trend**: bullish / stable / bearish (seeded probability)

---

## Quick Start

```bash
# Install dependencies
cd source && npm install

# Start MongoDB (docker)
docker run -d -p 27017:27017 --name mongo mongo:7

# Start Meilisearch (docker)
docker run -d -p 7700:7700 --name meili getmeili/meilisearch

# Seed 10,000 shoes
npx ts-node scripts/seed.ts --count 10000

# Start API server
npm run dev
```
