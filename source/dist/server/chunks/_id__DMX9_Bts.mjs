import { c as connectDB, S as Shoe } from './Shoe_D_cAQ5Jf.mjs';
import { ObjectId } from 'mongoose';

const GET = async ({ params }) => {
  try {
    await connectDB();
    const { id } = params;
    if (!id || !ObjectId.isValid(id)) {
      return new Response(JSON.stringify({ error: "Invalid shoe ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const shoe = await Shoe.findById(id).populate("collectionId").lean();
    if (!shoe) {
      return new Response(JSON.stringify({ error: "Shoe not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    Shoe.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec();
    return new Response(JSON.stringify({ data: shoe }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30, s-maxage=60"
      }
    });
  } catch (err) {
    console.error("[API] GET /api/shoes/[id] error:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch shoe" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
const PUT = async ({ params, request }) => {
  try {
    await connectDB();
    const { id } = params;
    if (!id || !ObjectId.isValid(id)) {
      return new Response(JSON.stringify({ error: "Invalid shoe ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const body = await request.json();
    const shoe = await Shoe.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true
    });
    if (!shoe) {
      return new Response(JSON.stringify({ error: "Shoe not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ data: shoe }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[API] PUT /api/shoes/[id] error:", err);
    return new Response(JSON.stringify({ error: "Failed to update shoe" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
const DELETE = async ({ params }) => {
  try {
    await connectDB();
    const { id } = params;
    if (!id || !ObjectId.isValid(id)) {
      return new Response(JSON.stringify({ error: "Invalid shoe ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const shoe = await Shoe.findByIdAndUpdate(id, {
      isActive: false,
      isArchived: true,
      "market.status": "ARCHIVED"
    }, { new: true });
    if (!shoe) {
      return new Response(JSON.stringify({ error: "Shoe not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ data: shoe, message: "Shoe archived" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[API] DELETE /api/shoes/[id] error:", err);
    return new Response(JSON.stringify({ error: "Failed to archive shoe" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  DELETE,
  GET,
  PUT
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
