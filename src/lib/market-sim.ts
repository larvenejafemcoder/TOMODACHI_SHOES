/**
 * Market Simulation Engine
 * Generates stable seeded prices, resale values, rarity tiers,
 * and market metadata for the Tomodachi Shoes archive.
 *
 * Price range: ¥890,000 (89万) to ¥4,000,000 (400万)
 */

const MIN_PRICE = 890_000;
const MAX_PRICE = 4_000_000;

const RARITY_TIERS = ['COMMON', 'LIMITED', 'RARE', 'LEGENDARY', 'MYTHIC'] as const;
export type RarityTier = typeof RARITY_TIERS[number];

const REGIONS = ['JP-TOKYO', 'JP-OSAKA', 'JP-KYOTO', 'KR-SEOUL', 'CN-SHANGHAI', 'US-NYC'] as const;

const CATEGORIES = ['speed', 'tech', 'limited', 'archive', 'collab'] as const;

const SERIES = [
  'TOKYO AERO', 'SHIBUYA NIGHT', 'AKIHABARA TECH',
  'SHINJUKU SPEED', 'GINZA LUXE', 'HARAJUKU STREET',
  'OSAKA RUN', 'NEO TOKYO', 'CYBER UNIT', 'GHOST EDITION',
] as const;

function mulberry32(seed: number): () => number {
  return function() {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export interface MarketData {
  price: number;
  priceFormatted: string;
  resaleValue: number;
  resaleFormatted: string;
  rarity: RarityTier;
  rarityScore: number;
  volatility: number;
  trend: 'bullish' | 'stable' | 'bearish';
  stock: number;
  status: 'ACTIVE' | 'ARCHIVED' | 'PENDING';
  region: string;
  category: string;
  series: string;
  energyClass: string;
  marketCap: number;
  lastSaleChange: number;
  demandIndex: number;
}

export function generateMarketData(seed: number): MarketData {
  const rng = mulberry32(seed);

  // Base price in 89万–400万 range
  const price = Math.floor(MIN_PRICE + rng() * (MAX_PRICE - MIN_PRICE));

  // Rarity determined by seeded probability
  const rarityRoll = rng();
  let rarity: RarityTier;
  if (rarityRoll > 0.98) rarity = 'MYTHIC';
  else if (rarityRoll > 0.92) rarity = 'LEGENDARY';
  else if (rarityRoll > 0.78) rarity = 'RARE';
  else if (rarityRoll > 0.50) rarity = 'LIMITED';
  else rarity = 'COMMON';

  const rarityMultipliers: Record<RarityTier, number> = {
    COMMON: 0.9 + rng() * 0.2,
    LIMITED: 1.1 + rng() * 0.4,
    RARE: 1.5 + rng() * 0.6,
    LEGENDARY: 2.5 + rng() * 1.5,
    MYTHIC: 4.0 + rng() * 3.0,
  };

  const resaleValue = Math.floor(price * rarityMultipliers[rarity]);

  const rarityScore = Math.floor(rng() * 100);
  const volatility = parseFloat((rng() * 0.35 + 0.02).toFixed(3));

  const trendRoll = rng();
  const trend: 'bullish' | 'stable' | 'bearish' =
    trendRoll > 0.6 ? 'bullish' :
    trendRoll > 0.25 ? 'stable' : 'bearish';

  const maxStock = rarity === 'MYTHIC' ? 5 :
                   rarity === 'LEGENDARY' ? 20 :
                   rarity === 'RARE' ? 60 :
                   rarity === 'LIMITED' ? 200 : 1000;
  const stock = Math.max(1, Math.floor(rng() * maxStock));

  const status: 'ACTIVE' | 'ARCHIVED' | 'PENDING' =
    stock > 0 ? 'ACTIVE' :
    rng() > 0.5 ? 'ARCHIVED' : 'PENDING';

  const region = REGIONS[Math.floor(rng() * REGIONS.length)];
  const category = CATEGORIES[Math.floor(rng() * CATEGORIES.length)];
  const series = SERIES[Math.floor(rng() * SERIES.length)];

  const energyClasses = ['A++', 'A+', 'A', 'B+', 'B'];
  const energyClass = energyClasses[Math.floor(rng() * energyClasses.length)];

  const marketCap = price * stock;
  const lastSaleChange = parseFloat(((rng() - 0.5) * 0.12).toFixed(4));
  const demandIndex = Math.floor(rng() * 100);

  return {
    price,
    priceFormatted: `¥${price.toLocaleString()}`,
    resaleValue,
    resaleFormatted: `¥${resaleValue.toLocaleString()}`,
    rarity,
    rarityScore,
    volatility,
    trend,
    stock,
    status,
    region,
    category,
    series,
    energyClass,
    marketCap,
    lastSaleChange,
    demandIndex,
  };
}

export function batchGenerateMarketData(
  count: number,
  startSeed: number = 1
): MarketData[] {
  return Array.from({ length: count }, (_, i) =>
    generateMarketData(startSeed + i)
  );
}

export function formatJPPrice(amount: number): string {
  if (amount >= 10_000) {
    return `¥${(amount / 10_000).toFixed(1)}万`;
  }
  return `¥${amount.toLocaleString()}`;
}
