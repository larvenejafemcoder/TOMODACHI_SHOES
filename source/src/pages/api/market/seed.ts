import type { APIRoute } from 'astro';
import { connectDB } from '../../../lib/db';
import { Shoe } from '../../../models/Shoe';
import { Collection } from '../../../models/Collection';
import { generateMarketData, batchGenerateMarketData } from '../../../lib/market-sim';
import { createSearchIndex, indexShoes } from '../../../lib/meilisearch';
import fs from 'fs/promises';
import path from 'path';

/**
 * Seeds the database with market-generated product data.
 * Scans local images and creates full Shoe documents.
 */

const SERIES_NAMES = [
  'TOKYO AERO', 'SHIBUYA NIGHT', 'AKIHABARA TECH',
  'SHINJUKU SPEED', 'GINZA LUXE', 'HARAJUKU STREET',
  'OSAKA RUN', 'NEO TOKYO', 'CYBER UNIT', 'GHOST EDITION',
];

const JP_LABELS = ['速度', '加速', '未来', '都市', '運動', '革新', '疾走', '風'];

const DESIGNERS = ['Yamamoto', 'Tanaka', 'Sato', 'Nakamura', 'Watanabe', 'Ito', 'Kimura', 'Suzuki'];

const COLORWAYS = [
  'BLACK/MATTE', 'PURPLE/CHROME', 'CRIMSON/BLACK',
  'WHITE/GHOST', 'NEON/STEALTH', 'GRAPHITE/ORANGE',
  'STEEL/BLUE', 'OBSIDIAN/GOLD',
];

const MATERIALS = [
  'FLYKNIT', 'TPU', 'CARBON FIBER', 'GORE-TEX',
  'PREMIUM LEATHER', 'MESH', 'DYNEEMA', 'KEVLAR',
];

const TECHNOLOGIES = [
  'AIR ZOOM', 'REACT FOAM', 'CARBON PLATE',
  'ENERGY RETURN', 'SHOCK ABSORPTION', 'GEL CUSHION',
  'BOOST FOAM', 'AIR SUSPENSION',
];

export const POST: APIRoute = async ({ request }) => {
  try {
    await connectDB();

    const body = await request.json();
    const count = Math.min(body.count || 1000, 50000);
    const startId = body.startId || 1;
    const imageDir = body.imageDir || process.env.ASSETS_DIR || './assets/images';
    const clearExisting = body.clearExisting ?? false;

    // Optional: clear existing data
    if (clearExisting) {
      await Shoe.deleteMany({});
      console.log('[Seed] Cleared existing shoes');
    }

    // Scan image files
    let imageFiles: string[] = [];
    try {
      const files = await fs.readdir(imageDir);
      imageFiles = files
        .filter(f => /\.(jpg|jpeg|png|webp|svg|avif)$/i.test(f))
        .sort((a, b) => {
          const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
          const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
          return numA - numB;
        });
      console.log(`[Seed] Found ${imageFiles.length} images`);
    } catch {
      console.warn('[Seed] Image directory not found, proceeding without images');
    }

    // Create collections
    const collectionData = [
      { name: 'Main Archive', slug: 'archive-main', jpName: 'メインアーカイブ', season: 'ALL', year: 2024 },
      { name: 'Tokyo Aero', slug: 'tokyo-aero', jpName: '東京エアロ', season: 'SPRING', year: 2024 },
      { name: 'Shibuya Night', slug: 'shibuya-night', jpName: '渋谷ナイト', season: 'SUMMER', year: 2024 },
      { name: 'Akihabara Tech', slug: 'akihabara-tech', jpName: '秋葉原テック', season: 'FALL', year: 2024 },
      { name: 'Shinjuku Speed', slug: 'shinjuku-speed', jpName: '新宿スピード', season: 'WINTER', year: 2024 },
      { name: 'Ghost Edition', slug: 'ghost-edition', jpName: 'ゴーストエディション', season: 'LIMITED', year: 2025 },
    ];

    if (clearExisting) {
      await Collection.deleteMany({});
    }

    const collections = await Collection.insertMany(collectionData);
    console.log(`[Seed] Created ${collections.length} collections`);

    // Generate market data in bulk
    const marketData = batchGenerateMarketData(count, startId);

    // Build shoe documents
    const shoeDocs = [];
    const searchDocs = [];

    for (let i = 0; i < count; i++) {
      const idx = startId + i;
      const market = marketData[i];
      const series = SERIES_NAMES[idx % SERIES_NAMES.length];
      const jpLabel = JP_LABELS[idx % JP_LABELS.length];
      const slug = `unit-${String(idx).padStart(4, '0')}`;
      const name = `UNIT ${String(idx).padStart(4, '0')}`;
      const collection = collections[idx % collections.length];

      // Pick an image
      const imgFile = imageFiles.length > 0
        ? imageFiles[idx % imageFiles.length]
        : null;
      const imageUrl = imgFile ? `/assets/images/${imgFile}` : '';
      const thumbnailUrl = imgFile ? `/assets/images/${imgFile}` : '';

      const doc = {
        name,
        slug,
        sku: `TM-${String(idx).padStart(6, '0')}`,
        jpLabel,
        description: `The ${name} from the ${series} collection. Precision-engineered in Japan for the Neo-Tokyo streets.`,
        jpDescription: `${series}コレクションの${name}。日本の精密技術でネオ東京のストリートのために設計されました。`,
        primaryImage: {
          url: imageUrl,
          secureUrl: imageUrl,
          publicId: `tomodachi/shoes/${slug}/main`,
          width: 1200, height: 1200,
          format: imgFile ? imgFile.split('.').pop() || 'jpg' : 'jpg',
          bytes: 0,
          thumbnailUrl,
          webpUrl: imageUrl.replace(/\.(jpg|jpeg|png|svg)$/, '.webp'),
          avifUrl: imageUrl.replace(/\.(jpg|jpeg|png|svg)$/, '.avif'),
          variant: 'main',
          alt: name,
        },
        images: imgFile ? [{
          url: imageUrl,
          secureUrl: imageUrl,
          publicId: `tomodachi/shoes/${slug}/main`,
          width: 1200, height: 1200,
          format: imgFile.split('.').pop() || 'jpg',
          bytes: 0,
          thumbnailUrl,
          webpUrl: imageUrl.replace(/\.(jpg|jpeg|png|svg)$/, '.webp'),
          avifUrl: imageUrl.replace(/\.(jpg|jpeg|png|svg)$/, '.avif'),
          variant: 'main',
          alt: name,
        }] : [],
        market,
        release: {
          date: new Date(2024, idx % 12, (idx % 28) + 1),
          season: ['SPRING', 'SUMMER', 'FALL', 'WINTER'][idx % 4],
          year: 2024 + (idx % 3),
          dropNumber: (idx % 50) + 1,
          isExclusive: market.rarity === 'MYTHIC' || market.rarity === 'LEGENDARY',
          regionLock: market.region ? [market.region] : [],
        },
        collectionId: collection._id,
        tags: [market.rarity.toLowerCase(), market.category, market.region?.toLowerCase()].filter(Boolean),
        series,
        designer: DESIGNERS[idx % DESIGNERS.length],
        colorways: [COLORWAYS[idx % COLORWAYS.length]],
        materials: [MATERIALS[idx % MATERIALS.length]],
        technology: [TECHNOLOGIES[idx % TECHNOLOGIES.length]],
        weight: 180 + (idx % 120),
        weightUnit: 'g',
        origin: 'JAPAN',
        energyClass: market.energyClass,
        isActive: true,
        isFeatured: idx % 10 === 0,
        viewCount: Math.floor(Math.random() * 5000),
        favoriteCount: Math.floor(Math.random() * 500),
      };

      shoeDocs.push(doc);
      searchDocs.push({
        id: slug,
        name,
        slug,
        series,
        jpLabel,
        rarity: market.rarity,
        price: market.price,
        resaleValue: market.resaleValue,
        stock: market.stock,
        status: market.status,
        region: market.region,
        imageUrl,
        thumbnailUrl,
        category: market.category,
        trend: market.trend,
        demandIndex: market.demandIndex,
        tags: [market.rarity.toLowerCase(), market.category, market.energyClass],
        energyClass: market.energyClass,
        isActive: true,
      });
    }

    // Bulk insert in batches of 500
    const BATCH_SIZE = 500;
    let insertedCount = 0;
    for (let i = 0; i < shoeDocs.length; i += BATCH_SIZE) {
      const batch = shoeDocs.slice(i, i + BATCH_SIZE);
      const result = await Shoe.insertMany(batch, { ordered: false });
      insertedCount += result.length;
      console.log(`[Seed] Inserted ${i + BATCH_SIZE}/${shoeDocs.length} shoes`);
    }

    // Update collection stats
    for (const collection of collections) {
      const stats = await Shoe.aggregate([
        { $match: { collectionId: collection._id, isActive: true } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalValue: { $sum: '$market.price' },
          },
        },
      ]);
      if (stats.length > 0) {
        await Collection.findByIdAndUpdate(collection._id, {
          shoeCount: stats[0].count,
          totalValue: stats[0].totalValue,
        });
      }
    }

    // Index in Meilisearch
    try {
      await createSearchIndex();
      // Index in chunks
      for (let i = 0; i < searchDocs.length; i += 500) {
        await indexShoes(searchDocs.slice(i, i + 500));
      }
      console.log(`[Seed] Indexed ${searchDocs.length} in Meilisearch`);
    } catch (meiliErr) {
      console.warn('[Seed] Meilisearch indexing skipped:', meiliErr);
    }

    return new Response(JSON.stringify({
      message: `Seeded ${insertedCount} shoes across ${collections.length} collections`,
      collections: collections.map(c => ({ name: c.name, slug: c.slug })),
      total: await Shoe.countDocuments({ isActive: true }),
      priceRange: {
        min: `¥${890_000.toLocaleString()}`,
        max: `¥${4_000_000.toLocaleString()}`,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[API] POST /api/market/seed error:', err);
    return new Response(JSON.stringify({
      error: 'Seed failed',
      message: err instanceof Error ? err.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
