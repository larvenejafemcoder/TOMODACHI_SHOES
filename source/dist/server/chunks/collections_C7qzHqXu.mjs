import { c as connectDB } from './Shoe_D_cAQ5Jf.mjs';
import { C as Collection } from './Collection_CNv99q0L.mjs';

const GET = async ({ url }) => {
  try {
    await connectDB();
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 50);
    const skip = (page - 1) * limit;
    const featured = url.searchParams.get("featured");
    const year = url.searchParams.get("year");
    const filter = { isActive: true };
    if (featured === "true") filter.isFeatured = true;
    if (year) filter.year = parseInt(year, 10);
    const [collections, total] = await Promise.all([
      Collection.find(filter).sort({ year: -1, season: 1 }).skip(skip).limit(limit).lean(),
      Collection.countDocuments(filter)
    ]);
    const totalPages = Math.ceil(total / limit);
    return new Response(JSON.stringify({
      data: collections,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=600"
      }
    });
  } catch (err) {
    console.error("[API] GET /api/collections error:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch collections" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
const POST = async ({ request }) => {
  try {
    await connectDB();
    const body = await request.json();
    const collection = new Collection(body);
    await collection.save();
    return new Response(JSON.stringify({ data: collection }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[API] POST /api/collections error:", err);
    return new Response(JSON.stringify({ error: "Failed to create collection" }), {
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
