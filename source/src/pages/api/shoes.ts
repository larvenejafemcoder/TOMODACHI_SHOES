import type { APIRoute } from 'astro';
import { connectDB } from '../../lib/db';
import { Shoe } from '../../models/Shoe';

export const GET: APIRoute = async ({ url }) => {
  try {
    await connectDB();

    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '24', 10), 100);
    const skip = (page - 1) * limit;

    const rarity = url.searchParams.get('rarity');
    const category = url.searchParams.get('category');
    const region = url.searchParams.get('region');
    const status = url.searchParams.get('status');
    const sort = url.searchParams.get('sort') || '-createdAt';
    const search = url.searchParams.get('q');
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');
    const featured = url.searchParams.get('featured');
    const collection = url.searchParams.get('collection');

    // Build filter
    const filter: Record<string, unknown> = {};

    if (rarity) filter['market.rarity'] = rarity.toUpperCase();
    if (category) filter['market.category'] = category;
    if (region) filter['market.region'] = region;
    if (status) filter['market.status'] = status.toUpperCase();
    if (featured === 'true') filter.isFeatured = true;
    if (collection) filter.collectionId = collection;

    if (minPrice || maxPrice) {
      const priceFilter: Record<string, number> = {};
      if (minPrice) priceFilter.$gte = parseInt(minPrice, 10);
      if (maxPrice) priceFilter.$lte = parseInt(maxPrice, 10);
      filter['market.price'] = priceFilter;
    }

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Sort
    let sortObj: Record<string, 1 | -1> = {};
    if (sort.startsWith('-')) {
      sortObj[sort.slice(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }

    const [shoes, total] = await Promise.all([
      Shoe.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Shoe.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return new Response(JSON.stringify({
      data: shoes,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=120',
      },
    });
  } catch (err) {
    console.error('[API] GET /api/shoes error:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch shoes' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    await connectDB();
    const body = await request.json();

    const shoe = new Shoe(body);
    await shoe.save();

    return new Response(JSON.stringify({ data: shoe }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[API] POST /api/shoes error:', err);
    return new Response(JSON.stringify({ error: 'Failed to create shoe' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
