import type { APIRoute } from 'astro';
import { connectDB } from '../../../lib/db';
import { Shoe } from '../../../models/Shoe';
import { fetchRealtimePrice, batchUpdatePrices } from '../../../lib/price-feed';

/**
 * GET /api/market/prices?slug=unit-0001
 * Fetches real-time (or simulated) price for a single shoe.
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    await connectDB();

    const slug = url.searchParams.get('slug');
    const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 100);

    if (slug) {
      const shoe = await Shoe.findOne({ slug, isActive: true });
      if (!shoe) {
        return new Response(JSON.stringify({ error: 'Shoe not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
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
        lastUpdated: priceData.lastUpdated,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const shoes = await Shoe.find({ isActive: true })
      .sort({ 'market.demandIndex': -1 })
      .limit(limit)
      .select('slug name market.price market.resaleValue market.volatility market.demandIndex')
      .lean();

    return new Response(JSON.stringify({
      count: shoes.length,
      prices: shoes.map(s => ({
        slug: s.slug,
        name: s.name,
        price: s.market?.price || 0,
        resaleValue: s.market?.resaleValue || 0,
        volatility: s.market?.volatility || 0,
        demandIndex: s.market?.demandIndex || 0,
      })),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[API] GET /api/market/prices error:', err);
    return new Response(JSON.stringify({
      error: 'Failed to fetch prices',
      message: err instanceof Error ? err.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * POST /api/market/prices
 * Triggers a batch price update for top N shoes by demand.
 * Body: { count?: number, slugs?: string[] }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const count = Math.min(body.count || 50, 500);
    let slugs: string[] = body.slugs || [];

    if (slugs.length === 0) {
      const shoes = await Shoe.find({ isActive: true })
        .sort({ 'market.demandIndex': -1 })
        .limit(count)
        .select('slug')
        .lean();
      slugs = shoes.map(s => s.slug);
    }

    const results = await batchUpdatePrices(slugs);

    return new Response(JSON.stringify({
      updated: results.filter(r => r.updated).length,
      total: results.length,
      source: results[0]?.sneakerId
        ? (await fetchRealtimePrice(results[0].sneakerId)).source
        : 'none',
      results: results.slice(0, 10),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[API] POST /api/market/prices error:', err);
    return new Response(JSON.stringify({
      error: 'Price update failed',
      message: err instanceof Error ? err.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
