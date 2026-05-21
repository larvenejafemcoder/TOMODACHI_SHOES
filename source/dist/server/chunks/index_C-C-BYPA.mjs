import { c as connectDB, S as Shoe } from './Shoe_D_cAQ5Jf.mjs';

const GET = async () => {
  try {
    await connectDB();
    const [
      totalShoes,
      activeShoes,
      totalValue,
      rarityDistribution,
      regionDistribution,
      topDemand,
      marketStats
    ] = await Promise.all([
      Shoe.countDocuments({ isActive: true }),
      Shoe.countDocuments({ "market.status": "ACTIVE" }),
      Shoe.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: "$market.marketCap" } } }
      ]),
      Shoe.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: "$market.rarity", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Shoe.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: "$market.region", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Shoe.find({ isActive: true }).sort({ "market.demandIndex": -1 }).limit(10).select("name slug market.price market.resaleValue market.demandIndex market.rarity").lean(),
      Shoe.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: "$market.price" },
            minPrice: { $min: "$market.price" },
            maxPrice: { $max: "$market.price" },
            avgVolatility: { $avg: "$market.volatility" },
            avgDemand: { $avg: "$market.demandIndex" }
          }
        }
      ])
    ]);
    return new Response(JSON.stringify({
      overview: {
        totalShoes,
        activeShoes,
        archivedShoes: totalShoes - activeShoes,
        totalMarketCap: totalValue[0]?.total || 0,
        totalMarketCapFormatted: `¥${((totalValue[0]?.total || 0) / 1e4).toFixed(0)}万`
      },
      marketStats: marketStats[0] || {},
      rarityDistribution,
      regionDistribution,
      topDemand
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=120, s-maxage=300"
      }
    });
  } catch (err) {
    console.error("[API] GET /api/market error:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch market data" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
