const MIN_PRICE = 89e4;
const MAX_PRICE = 4e6;
const REGIONS = ["JP-TOKYO", "JP-OSAKA", "JP-KYOTO", "KR-SEOUL", "CN-SHANGHAI", "US-NYC"];
const CATEGORIES = ["speed", "tech", "limited", "archive", "collab"];
const SERIES = [
  "TOKYO AERO",
  "SHIBUYA NIGHT",
  "AKIHABARA TECH",
  "SHINJUKU SPEED",
  "GINZA LUXE",
  "HARAJUKU STREET",
  "OSAKA RUN",
  "NEO TOKYO",
  "CYBER UNIT",
  "GHOST EDITION"
];
function mulberry32(seed) {
  return function() {
    seed |= 0;
    seed = seed + 1831565813 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function generateMarketData(seed) {
  const rng = mulberry32(seed);
  const price = Math.floor(MIN_PRICE + rng() * (MAX_PRICE - MIN_PRICE));
  const rarityRoll = rng();
  let rarity;
  if (rarityRoll > 0.98) rarity = "MYTHIC";
  else if (rarityRoll > 0.92) rarity = "LEGENDARY";
  else if (rarityRoll > 0.78) rarity = "RARE";
  else if (rarityRoll > 0.5) rarity = "LIMITED";
  else rarity = "COMMON";
  const rarityMultipliers = {
    COMMON: 0.9 + rng() * 0.2,
    LIMITED: 1.1 + rng() * 0.4,
    RARE: 1.5 + rng() * 0.6,
    LEGENDARY: 2.5 + rng() * 1.5,
    MYTHIC: 4 + rng() * 3
  };
  const resaleValue = Math.floor(price * rarityMultipliers[rarity]);
  const rarityScore = Math.floor(rng() * 100);
  const volatility = parseFloat((rng() * 0.35 + 0.02).toFixed(3));
  const trendRoll = rng();
  const trend = trendRoll > 0.6 ? "bullish" : trendRoll > 0.25 ? "stable" : "bearish";
  const maxStock = rarity === "MYTHIC" ? 5 : rarity === "LEGENDARY" ? 20 : rarity === "RARE" ? 60 : rarity === "LIMITED" ? 200 : 1e3;
  const stock = Math.max(1, Math.floor(rng() * maxStock));
  const status = stock > 0 ? "ACTIVE" : rng() > 0.5 ? "ARCHIVED" : "PENDING";
  const region = REGIONS[Math.floor(rng() * REGIONS.length)];
  const category = CATEGORIES[Math.floor(rng() * CATEGORIES.length)];
  const series = SERIES[Math.floor(rng() * SERIES.length)];
  const energyClasses = ["A++", "A+", "A", "B+", "B"];
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
    demandIndex
  };
}
function batchGenerateMarketData(count, startSeed = 1) {
  return Array.from(
    { length: count },
    (_, i) => generateMarketData(startSeed + i)
  );
}

export { batchGenerateMarketData as b, generateMarketData as g };
