import type { APIRoute } from 'astro';
import { connectDB } from '../../../lib/db';
import { Shoe } from '../../../models/Shoe';
import { Collection } from '../../../models/Collection';
import { generateMarketData } from '../../../lib/market-sim';
import { uploadBatchImages } from '../../../lib/cloudinary';
import { indexShoes, createSearchIndex } from '../../../lib/meilisearch';
import fs from 'fs/promises';
import path from 'path';

export const POST: APIRoute = async ({ request }) => {
  try {
    await connectDB();

    const body = await request.json();
    const imageDir = body.imageDir || process.env.ASSETS_DIR || './assets/images';
    const batchSize = Math.min(body.batchSize || 100, 1000);
    const startIndex = body.startIndex || 0;
    const uploadToCDN = body.uploadToCDN ?? false;

    // Scan image directory
    const files = await fs.readdir(imageDir);
    const imageFiles = files
      .filter(f => /\.(jpg|jpeg|png|webp|svg|avif)$/i.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
        return numA - numB;
      });

    const batch = imageFiles.slice(startIndex, startIndex + batchSize);
    if (batch.length === 0) {
      return new Response(JSON.stringify({
        message: 'No images found to process',
        totalImages: imageFiles.length,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Ensure default collection exists
    let defaultCollection = await Collection.findOne({ slug: 'archive-main' });
    if (!defaultCollection) {
      defaultCollection = await Collection.create({
        name: 'Main Archive',
        slug: 'archive-main',
        jpName: 'メインアーカイブ',
        description: 'Primary Tomodachi Shoes archive collection',
        season: 'ALL',
        year: new Date().getFullYear(),
        isActive: true,
      });
    }

    const shoeDocuments = [];
    const searchDocuments = [];

    for (let i = 0; i < batch.length; i++) {
      const file = batch[i];
      const filePath = path.join(imageDir, file);
      const shoeIndex = startIndex + i;
      const seed = shoeIndex + 1;

      // Generate market data
      const market = generateMarketData(seed);

      // Image path for local reference
      const imageUrl = `/assets/images/${file}`;
      const thumbnailUrl = `/assets/images/${file}`;

      const slug = `unit-${String(seed).padStart(4, '0')}`;
      const name = `UNIT ${String(seed).padStart(4, '0')}`;
      const jpLabel = ['速度', '加速', '未来', '都市', '運動', '革新', '疾走', '風'][seed % 8];
      const names = [
        'TOKYO AERO', 'SHIBUYA NIGHT', 'AKIHABARA TECH',
        'SHINJUKU SPEED', 'GINZA LUXE', 'HARAJUKU STREET',
        'OSAKA RUN', 'NEO TOKYO', 'CYBER UNIT', 'GHOST EDITION',
      ];
      const series = names[seed % names.length];

      // Create shoe document
      const shoeData = {
        name,
        slug,
        sku: `TM-${String(seed).padStart(6, '0')}`,
        jpLabel,
        description: `The ${name} from the ${series} collection. Engineered for the Neo-Tokyo streets.`,
        jpDescription: `${series}コレクションの${name}。ネオ東京のストリートのために設計されました。`,
        primaryImage: {
          url: imageUrl,
          secureUrl: imageUrl,
          publicId: `tomodachi/shoes/${slug}/main`,
          width: 1200,
          height: 1200,
          format: file.split('.').pop() || 'jpg',
          bytes: 0,
          thumbnailUrl,
          webpUrl: imageUrl.replace(/\.(jpg|jpeg|png|svg)$/, '.webp'),
          avifUrl: imageUrl.replace(/\.(jpg|jpeg|png|svg)$/, '.avif'),
          variant: 'main',
          alt: name,
        },
        images: [
          {
            url: imageUrl,
            secureUrl: imageUrl,
            publicId: `tomodachi/shoes/${slug}/main`,
            width: 1200, height: 1200,
            format: file.split('.').pop() || 'jpg',
            bytes: 0,
            thumbnailUrl,
            webpUrl: imageUrl.replace(/\.(jpg|jpeg|png|svg)$/, '.webp'),
            avifUrl: imageUrl.replace(/\.(jpg|jpeg|png|svg)$/, '.avif'),
            variant: 'main',
            alt: name,
          },
        ],
        market,
        release: {
          date: new Date(2024, seed % 12, (seed % 28) + 1),
          season: ['SPRING', 'SUMMER', 'FALL', 'WINTER'][seed % 4],
          year: 2024 + (seed % 3),
          dropNumber: seed % 50 + 1,
          isExclusive: market.rarity === 'MYTHIC' || market.rarity === 'LEGENDARY',
          regionLock: market.region ? [market.region] : [],
        },
        collectionId: defaultCollection._id,
        tags: [market.rarity.toLowerCase(), market.category, market.region?.toLowerCase()].filter(Boolean),
        series,
        designer: ['Yamamoto', 'Tanaka', 'Sato', 'Nakamura', 'Watanabe', 'Ito'][seed % 6],
        colorways: ['BLACK/MATTE', 'PURPLE/CHROME', 'CRIMSON/BLACK', 'WHITE/GHOST', 'NEON/STEALTH'][seed % 5],
        materials: ['FLYKNIT', 'TPU', 'CARBON FIBER', 'GORE-TEX', 'PREMIUM LEATHER', 'MESH'][seed % 6],
        technology: ['AIR ZOOM', 'REACT FOAM', 'CARBON PLATE', 'ENERGY RETURN', 'SHOCK ABSORPTION'][seed % 5],
        weight: 180 + (seed % 120),
        weightUnit: 'g',
        origin: 'JAPAN',
        energyClass: market.energyClass,
        isActive: true,
        isFeatured: seed % 10 === 0,
        viewCount: Math.floor(Math.random() * 5000),
        favoriteCount: Math.floor(Math.random() * 500),
      };

      const searchDoc = {
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
        tags: [market.rarity.toLowerCase(), market.category],
        energyClass: market.energyClass,
        isActive: true,
      };

      shoeDocuments.push(shoeData);
      searchDocuments.push(searchDoc);
    }

    // Bulk insert
    const inserted = await Shoe.insertMany(shoeDocuments, { ordered: false });
    console.log(`[Import] Inserted ${inserted.length} shoes`);

    // Update collection count + value
    const totalValue = shoeDocuments.reduce((sum, s) => sum + s.market.price, 0);
    await Collection.findByIdAndUpdate(defaultCollection._id, {
      $inc: { shoeCount: inserted.length, totalValue },
    });

    // Index in Meilisearch
    try {
      await createSearchIndex();
      await indexShoes(searchDocuments);
      console.log(`[Import] Indexed ${searchDocuments.length} in Meilisearch`);
    } catch (meiliErr) {
      console.warn('[Import] Meilisearch indexing skipped (optional):', meiliErr);
    }

    // Upload images to CDN if requested
    let cdnResults = [];
    if (uploadToCDN) {
      for (const shoe of shoeDocuments) {
        const filePath = path.join(imageDir, path.basename(shoe.primaryImage.url));
        try {
          const result = await uploadBatchImages([filePath], shoe.slug);
          cdnResults.push({ slug: shoe.slug, result });
        } catch (cdnErr) {
          console.warn(`[Import] CDN upload skipped for ${shoe.slug}:`, cdnErr);
        }
      }
    }

    return new Response(JSON.stringify({
      message: `Imported ${inserted.length} shoes`,
      processed: batch.length,
      totalInArchive: await Shoe.countDocuments({ isActive: true }),
      startIndex,
      endIndex: startIndex + batch.length,
      remaining: Math.max(0, imageFiles.length - (startIndex + batch.length)),
      cdnUploaded: cdnResults.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[API] POST /api/import/batch error:', err);
    return new Response(JSON.stringify({
      error: 'Import failed',
      message: err instanceof Error ? err.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
