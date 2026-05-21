import { c as connectDB, S as Shoe } from './Shoe_D_cAQ5Jf.mjs';
import { g as getSearchClient } from './meilisearch_DRNFvghT.mjs';

const GET = async ({ url }) => {
  try {
    await connectDB();
    const q = url.searchParams.get("q") || "";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "24", 10), 100);
    const offset = (page - 1) * limit;
    const rarity = url.searchParams.get("rarity");
    const category = url.searchParams.get("category");
    const region = url.searchParams.get("region");
    const sort = url.searchParams.get("sort");
    const filters = [];
    if (rarity) filters.push(`rarity = ${rarity.toUpperCase()}`);
    if (category) filters.push(`category = ${category}`);
    if (region) filters.push(`region = ${region}`);
    const sortOptions = [];
    if (sort) {
      const dir = sort.startsWith("-") ? "desc" : "asc";
      const field = sort.replace(/^-/, "");
      sortOptions.push(`${field}:${dir}`);
    }
    try {
      const client = getSearchClient();
      const results = await client.index("tomodachi_shoes").search(q, {
        limit,
        offset,
        filter: filters.length > 0 ? filters.join(" AND ") : void 0,
        sort: sortOptions.length > 0 ? sortOptions : void 0,
        attributesToHighlight: ["name", "series", "jpLabel"]
      });
      const hits = results.hits.map((hit) => ({
        ...hit,
        _highlight: results.hits.find((h) => h.id === hit.id)?._formatted
      }));
      return new Response(JSON.stringify({
        data: hits,
        pagination: {
          page,
          limit,
          total: results.estimatedTotalHits || 0,
          totalPages: Math.ceil((results.estimatedTotalHits || 0) / limit)
        },
        processingTimeMs: results.processingTimeMs
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=30, s-maxage=60"
        }
      });
    } catch {
      const filter = {};
      if (q) filter.$text = { $search: q };
      if (rarity) filter["market.rarity"] = rarity.toUpperCase();
      if (category) filter["market.category"] = category;
      if (region) filter["market.region"] = region;
      const sortObj = {};
      if (sort) {
        const field = sort.replace(/^-/, "");
        sortObj[field] = sort.startsWith("-") ? -1 : 1;
      } else if (q) {
        sortObj.score = { $meta: "textScore" };
      } else {
        sortObj.createdAt = -1;
      }
      const [shoes, total] = await Promise.all([
        Shoe.find(filter).sort(sortObj).skip(offset).limit(limit).lean(),
        Shoe.countDocuments(filter)
      ]);
      return new Response(JSON.stringify({
        data: shoes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        source: "mongodb-fallback"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=30, s-maxage=60"
        }
      });
    }
  } catch (err) {
    console.error("[API] GET /api/shoes/search error:", err);
    return new Response(JSON.stringify({ error: "Search failed" }), {
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
