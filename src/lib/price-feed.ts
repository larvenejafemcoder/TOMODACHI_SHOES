const RAPIDAPI_HOST = 'real-time-sneaker-prices.p.rapidapi.com';
const BASE_URL = `https://${RAPIDAPI_HOST}`;

interface RapidApiPriceResponse {
  sneakerId: string;
  sneakerName: string;
  brand: string;
  retailPrice: number;
  marketPrice: number;
  lastSalePrice: number;
  pricePremium: number;
  volatility: number;
  stock: number;
  lastUpdated: string;
}

interface PriceUpdateResult {
  sneakerId: string;
  currentPrice: number;
  newPrice: number;
  volatility: number;
  demandIndex: number;
  updated: boolean;
}

function getApiKey(): string {
  const key = import.meta.env.RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || '';
  if (!key || key === 'your_rapidapi_key') {
    return '';
  }
  return key;
}

function seededPriceShift(sneakerId: string, basePrice: number): { price: number; volatility: number; demandIndex: number } {
  let hash = 0;
  for (let i = 0; i < sneakerId.length; i++) {
    hash = ((hash << 5) - hash) + sneakerId.charCodeAt(i);
    hash = hash & hash;
  }
  const seed = Math.abs(hash);
  const pseudo = ((seed * 9301 + 49297) % 233280) / 233280;

  const volatility = 0.05 + pseudo * 0.25;
  const trend = pseudo > 0.5 ? 1 : -1;
  const shift = basePrice * volatility * trend * pseudo;
  const newPrice = Math.round(basePrice + shift);

  const demandIndex = Math.round(pseudo * 100);

  return { price: Math.max(newPrice, 89000), volatility: Math.round(volatility * 100) / 100, demandIndex };
}

export async function fetchRealtimePrice(sneakerId: string): Promise<{
  source: 'rapidapi' | 'simulated';
  price: number;
  volatility: number;
  demandIndex: number;
  retailPrice?: number;
  marketPrice?: number;
  lastSalePrice?: number;
  lastUpdated?: string;
}> {
  const apiKey = getApiKey();

  if (apiKey) {
    try {
      const url = `${BASE_URL}/sneakers/${encodeURIComponent(sneakerId)}`;
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': apiKey,
        },
      });

      if (res.ok) {
        const data: RapidApiPriceResponse = await res.json();
        return {
          source: 'rapidapi',
          price: data.marketPrice || data.lastSalePrice || data.retailPrice,
          volatility: data.volatility || 0.1,
          demandIndex: 50,
          retailPrice: data.retailPrice,
          marketPrice: data.marketPrice,
          lastSalePrice: data.lastSalePrice,
          lastUpdated: data.lastUpdated,
        };
      }
    } catch (err) {
      console.warn(`[PriceFeed] RapidAPI fetch failed for ${sneakerId}, falling back to simulation:`, err);
    }
  }

  const seed = parseInt(sneakerId.replace(/\D/g, ''), 10) || 1;
  const basePrice = 890000 + (seed % 311) * 10000;
  const sim = seededPriceShift(sneakerId, basePrice);

  return {
    source: 'simulated',
    ...sim,
    lastUpdated: new Date().toISOString(),
  };
}

export async function batchUpdatePrices(sneakerIds: string[]): Promise<PriceUpdateResult[]> {
  const { connectDB } = await import('./db');
  const { Shoe } = await import('../models/Shoe');
  await connectDB();

  const results: PriceUpdateResult[] = [];

  for (const sneakerId of sneakerIds) {
    try {
      const shoe = await Shoe.findOne({ slug: sneakerId });
      if (!shoe) continue;

      const currentPrice = shoe.market?.price || 0;
      const update = await fetchRealtimePrice(sneakerId);

      const newPrice = update.price;

      const updated = newPrice !== currentPrice;

      if (updated) {
        const volatility = update.volatility;
        const demandIndex = update.demandIndex;
        const newResaleValue = Math.round(newPrice * (1 + (volatility * (demandIndex > 50 ? 0.2 : -0.1))));

        await Shoe.findOneAndUpdate(
          { slug: sneakerId },
          {
            $set: {
              'market.price': newPrice,
              'market.resaleValue': newResaleValue,
              'market.volatility': volatility,
              'market.demandIndex': demandIndex,
              'market.lastUpdated': new Date(update.lastUpdated || Date.now()),
              ...(update.source === 'rapidapi' ? { 'market.status': 'MARKET' } : {}),
            },
          }
        );
      }

      results.push({
        sneakerId,
        currentPrice,
        newPrice,
        volatility: update.volatility,
        demandIndex: update.demandIndex,
        updated,
      });
    } catch (err) {
      console.error(`[PriceFeed] Error updating ${sneakerId}:`, err);
    }
  }

  return results;
}
