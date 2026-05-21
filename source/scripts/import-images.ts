/**
 * CLI Batch Image Import Script
 * Scans a directory of images, compresses to WebP/AVIF,
 * uploads to Cloudinary, and creates Shoe records in MongoDB.
 *
 * Usage:
 *   npx ts-node scripts/import-images.ts --dir ./assets/images --cdn
 *   npx ts-node scripts/import-images.ts --dir ./assets/images --start 100 --batch 50
 */

import 'dotenv/config';
import { connectDB, disconnectDB } from '../src/lib/db';
import { Shoe } from '../src/models/Shoe';
import { Collection } from '../src/models/Collection';
import { generateMarketData } from '../src/lib/market-sim';
import { uploadBatchImages } from '../src/lib/cloudinary';
import { createSearchIndex, indexShoes } from '../src/lib/meilisearch';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const parseArg = (flag: string, defaultVal: string | number | boolean) => {
  const idx = args.indexOf(flag);
  if (idx === -1) return defaultVal;
  const val = args[idx + 1];
  if (val === undefined) return true;
  if (typeof defaultVal === 'number') return parseInt(val, 10);
  if (typeof defaultVal === 'boolean') return val === 'true' || val === '1';
  return val;
};

const IMAGE_DIR = parseArg('--dir', './assets/images') as string;
const START_INDEX = parseArg('--start', 0) as number;
const BATCH_SIZE = parseArg('--batch', 50) as number;
const UPLOAD_CDN = parseArg('--cdn', false) as boolean;
const OPTIMIZE = parseArg('--optimize', true) as boolean;

async function main() {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║   TOMODACHI — BATCH IMAGE IMPORT    ║`);
  console.log(`╚══════════════════════════════════════╝\n`);

  // Scan images
  const files = fs.readdirSync(IMAGE_DIR);
  const imageFiles = files
    .filter(f => /\.(jpg|jpeg|png|bmp|tiff)$/i.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
      return numA - numB;
    });

  console.log(`Found ${imageFiles.length.toLocaleString()} images`);
  console.log(`Processing: ${START_INDEX} → ${Math.min(START_INDEX + BATCH_SIZE, imageFiles.length)}\n`);

  if (imageFiles.length === 0) {
    console.log('No images found. Exiting.');
    process.exit(0);
  }

  await connectDB();

  // Ensure collection
  let collection = await Collection.findOne({ slug: 'import-batch' });
  if (!collection) {
    collection = await Collection.create({
      name: 'Import Batch',
      slug: 'import-batch',
      jpName: 'インポートバッチ',
      season: 'ALL',
      year: new Date().getFullYear(),
      isActive: true,
    });
  }

  const batch = imageFiles.slice(START_INDEX, START_INDEX + BATCH_SIZE);
  const outputDir = path.join(IMAGE_DIR, 'optimized');
  if (OPTIMIZE && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let imported = 0;
  const searchDocs: any[] = [];
  const shoeDocs: ShoeData[] = [];

  interface ShoeData {
    [key: string]: unknown;
    name: string;
    slug: string;
    market: ReturnType<typeof generateMarketData>;
  }

  for (let i = 0; i < batch.length; i++) {
    const file = batch[i];
    const filePath = path.join(IMAGE_DIR, file);
    const idx = START_INDEX + i + 1;
    const slug = `unit-${String(idx).padStart(4, '0')}`;

    process.stdout.write(`\r[${i + 1}/${batch.length}] ${file}`);

    // Optimize image
    let optimizedPath = filePath;
    if (OPTIMIZE) {
      const outName = file.replace(/\.(jpg|jpeg|png|bmp|tiff)$/i, '.webp');
      optimizedPath = path.join(outputDir, outName);
      try {
        await sharp(filePath)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82, effort: 6 })
          .toFile(optimizedPath);
      } catch (err) {
        console.warn(`\n  ⚠️  Optimization failed for ${file}, using original`);
        optimizedPath = filePath;
      }
    }

    // Upload to CDN
    let cdnResult = null;
    if (UPLOAD_CDN) {
      try {
        const results = await uploadBatchImages([optimizedPath], slug);
        cdnResult = results[0] || null;
      } catch (err) {
        console.warn(`\n  ⚠️  CDN upload failed for ${file}`);
      }
    }

    // Market data
    const market = generateMarketData(idx);

    // Create document
    const imageUrl = cdnResult
      ? cdnResult.secureUrl
      : `/assets/images/${file}`;

    const doc = {
      name: `UNIT ${String(idx).padStart(4, '0')}`,
      slug,
      sku: `TM-${String(idx).padStart(6, '0')}`,
      jpLabel: ['速度', '加速', '未来', '都市', '運動', '革新', '疾走', '風'][idx % 8],
      description: `Imported unit ${idx}. Optimized for the Neo-Tokyo archive.`,
      jpDescription: `インポートユニット ${idx}。ネオ東京アーカイブ用に最適化。`,
      primaryImage: cdnResult ? {
        url: cdnResult.secureUrl,
        secureUrl: cdnResult.secureUrl,
        publicId: cdnResult.publicId,
        width: cdnResult.width,
        height: cdnResult.height,
        format: cdnResult.format,
        bytes: cdnResult.bytes,
        thumbnailUrl: cdnResult.thumbnailUrl,
        webpUrl: cdnResult.webpUrl,
        avifUrl: cdnResult.avifUrl,
        variant: 'main',
        alt: doc.name,
      } : {
        url: imageUrl,
        secureUrl: imageUrl,
      },
      images: [{
        url: imageUrl,
        secureUrl: imageUrl,
        variant: 'main',
      }],
      market,
      collectionId: collection._id,
      tags: [market.rarity.toLowerCase(), market.category],
      isActive: true,
    };

    shoeDocs.push(doc as ShoeData);
    searchDocs.push({
      id: slug,
      name: doc.name,
      slug,
      rarity: market.rarity,
      price: market.price,
      resaleValue: market.resaleValue,
      stock: market.stock,
      status: market.status,
      region: market.region,
      imageUrl,
      thumbnailUrl: imageUrl,
      category: market.category,
      trend: market.trend,
      demandIndex: market.demandIndex,
      isActive: true,
    });

    imported++;
  }

  // Bulk insert
  if (shoeDocs.length > 0) {
    await Shoe.insertMany(shoeDocs, { ordered: false });
    await Collection.findByIdAndUpdate(collection._id, {
      $inc: { shoeCount: shoeDocs.length },
    });
  }

  console.log(`\n\n✅ Imported ${imported} shoes`);

  // Index
  try {
    await createSearchIndex();
    await indexShoes(searchDocs);
    console.log('✅ Indexed in Meilisearch');
  } catch {
    console.warn('⚠️  Meilisearch skipped');
  }

  await disconnectDB();
  console.log('Done.');
  process.exit(0);
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
