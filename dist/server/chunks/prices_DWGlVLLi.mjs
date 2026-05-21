import { c as connectDB, S as Shoe } from './Shoe_DTpxLiNh.mjs';

const RAPIDAPI_HOST = "real-time-sneaker-prices.p.rapidapi.com";
const BASE_URL = `https://${RAPIDAPI_HOST}`;
function getApiKey() {
  {
    return "";
  }
}
function seededPriceShift(sneakerId, basePrice) {
  let hash = 0;
  for (let i = 0; i < sneakerId.length; i++) {
    hash = (hash << 5) - hash + sneakerId.charCodeAt(i);
    hash = hash & hash;
  }
  const seed = Math.abs(hash);
  const pseudo = (seed * 9301 + 49297) % 233280 / 233280;
  const volatility = 0.05 + pseudo * 0.25;
  const trend = pseudo > 0.5 ? 1 : -1;
  const shift = basePrice * volatility * trend * pseudo;
  const newPrice = Math.round(basePrice + shift);
  const demandIndex = Math.round(pseudo * 100);
  return { price: Math.max(newPrice, 89e3), volatility: Math.round(volatility * 100) / 100, demandIndex };
}
async function fetchRealtimePrice(sneakerId) {
  const apiKey = getApiKey();
  if (apiKey) {
    try {
      const url = `${BASE_URL}/sneakers/${encodeURIComponent(sneakerId)}`;
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": RAPIDAPI_HOST,
          "x-rapidapi-key": apiKey
        }
      });
      if (res.ok) {
        const data = await res.json();
        return {
          source: "rapidapi",
          price: data.marketPrice || data.lastSalePrice || data.retailPrice,
          volatility: data.volatility || 0.1,
          demandIndex: 50,
          retailPrice: data.retailPrice,
          marketPrice: data.marketPrice,
          lastSalePrice: data.lastSalePrice,
          lastUpdated: data.lastUpdated
        };
      }
    } catch (err) {
      console.warn(`[PriceFeed] RapidAPI fetch failed for ${sneakerId}, falling back to simulation:`, err);
    }
  }
  const seed = parseInt(sneakerId.replace(/\D/g, ""), 10) || 1;
  const basePrice = 89e4 + seed % 311 * 1e4;
  const sim = seededPriceShift(sneakerId, basePrice);
  return {
    source: "simulated",
    ...sim,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function batchUpdatePrices(sneakerIds) {
  const { connectDB } = await import('./Shoe_DTpxLiNh.mjs').then(n => n.d);
  const { Shoe } = await import('./Shoe_DTpxLiNh.mjs').then(n => n.a);
  await connectDB();
  const results = [];
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
        const newResaleValue = Math.round(newPrice * (1 + volatility * (demandIndex > 50 ? 0.2 : -0.1)));
        await Shoe.findOneAndUpdate(
          { slug: sneakerId },
          {
            $set: {
              "market.price": newPrice,
              "market.resaleValue": newResaleValue,
              "market.volatility": volatility,
              "market.demandIndex": demandIndex,
              "market.lastUpdated": new Date(update.lastUpdated || Date.now()),
              ...update.source === "rapidapi" ? { "market.status": "MARKET" } : {}
            }
          }
        );
      }
      results.push({
        sneakerId,
        currentPrice,
        newPrice,
        volatility: update.volatility,
        demandIndex: update.demandIndex,
        updated
      });
    } catch (err) {
      console.error(`[PriceFeed] Error updating ${sneakerId}:`, err);
    }
  }
  return results;
}

const GET = async ({ url }) => {
  try {
    await connectDB();
    const slug = url.searchParams.get("slug");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 100);
    if (slug) {
      const shoe = await Shoe.findOne({ slug, isActive: true });
      if (!shoe) {
        return new Response(JSON.stringify({ error: "Shoe not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      const priceData = await fetchRealtimePrice(slug);
      return new Response(JSON.stringify({
        slug,
        name: shoe.name,
        currentMarketPrice: shoe.market?.price || 0,
        realtimePrice: priceData.price,
        source: priceData.source,
        volatility: priceData.volatility,
        demandIndex: priceData.demandIndex,
        lastUpdated: priceData.lastUpdated
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    const shoes = await Shoe.find({ isActive: true }).sort({ "market.demandIndex": -1 }).limit(limit).select("slug name market.price market.resaleValue market.volatility market.demandIndex").lean();
    return new Response(JSON.stringify({
      count: shoes.length,
      prices: shoes.map((s) => ({
        slug: s.slug,
        name: s.name,
        price: s.market?.price || 0,
        resaleValue: s.market?.resaleValue || 0,
        volatility: s.market?.volatility || 0,
        demandIndex: s.market?.demandIndex || 0
      }))
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[API] GET /api/market/prices error:", err);
    return new Response(JSON.stringify({
      error: "Failed to fetch prices",
      message: err instanceof Error ? err.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
const POST = async ({ request }) => {
  try {
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const count = Math.min(body.count || 50, 500);
    let slugs = body.slugs || [];
    if (slugs.length === 0) {
      const shoes = await Shoe.find({ isActive: true }).sort({ "market.demandIndex": -1 }).limit(count).select("slug").lean();
      slugs = shoes.map((s) => s.slug);
    }
    const results = await batchUpdatePrices(slugs);
    return new Response(JSON.stringify({
      updated: results.filter((r) => r.updated).length,
      total: results.length,
      source: results[0]?.sneakerId ? (await fetchRealtimePrice(results[0].sneakerId)).source : "none",
      results: results.slice(0, 10)
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[API] POST /api/market/prices error:", err);
    return new Response(JSON.stringify({
      error: "Price update failed",
      message: err instanceof Error ? err.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
