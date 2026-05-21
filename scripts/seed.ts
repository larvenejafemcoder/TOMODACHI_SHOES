/**
 * CLI Seed Script — Tomodachi Shoes Database
 *
 * Usage:
 *   npx ts-node scripts/seed.ts --count 10000 --clear
 *   npx ts-node scripts/seed.ts --count 500 --start 5000
 *
 * Options:
 *   --count    Number of shoes to generate (default: 1000, max: 50000)
 *   --start    Starting product ID (default: 1)
 *   --clear    Clear existing data before seeding (default: false)
 *   --images   Path to image directory (default: ./assets/images)
 *   --meili    Enable Meilisearch indexing (default: true)
 */

import 'dotenv/config';
import { connectDB, disconnectDB } from '../src/lib/db';
import { Shoe } from '../src/models/Shoe';
import { Collection } from '../src/models/Collection';
import { generateMarketData } from '../src/lib/market-sim';
import { createSearchIndex, indexShoes } from '../src/lib/meilisearch';
import fs from 'fs';
import path from 'path';

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

const COUNT = Math.min(parseArg('--count', 1000) as number, 50000);
const START_ID = parseArg('--start', 1) as number;
const CLEAR = parseArg('--clear', false) as boolean;
const IMAGE_DIR = parseArg('--images', './assets/images') as string;
const ENABLE_MEILI = parseArg('--meili', true) as boolean;

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
const MATERIALS = ['FLYKNIT', 'TPU', 'CARBON FIBER', 'GORE-TEX', 'PREMIUM LEATHER', 'MESH', 'DYNEEMA', 'KEVLAR'];
const TECHNOLOGIES = ['AIR ZOOM', 'REACT FOAM', 'CARBON PLATE', 'ENERGY RETURN', 'SHOCK ABSORPTION', 'GEL CUSHION', 'BOOST FOAM', 'AIR SUSPENSION'];

async function main() {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║   TOMODACHI SHOES — DATA SEED       ║`);
  console.log(`╚══════════════════════════════════════╝\n`);
  console.log(`Count:    ${COUNT.toLocaleString()}`);
  console.log(`Start ID: ${START_ID}`);
  console.log(`Clear:    ${CLEAR}`);
  console.log(`Images:   ${IMAGE_DIR}\n`);

  await connectDB();

  if (CLEAR) {
    console.log('Clearing existing data...');
    await Shoe.deleteMany({});
    await Collection.deleteMany({});
  }

  // Scan images
  let imageFiles: string[] = [];
  try {
    const files = fs.readdirSync(IMAGE_DIR);
    imageFiles = files
      .filter(f => /\.(jpg|jpeg|png|webp|svg|avif)$/i.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
        return numA - numB;
      });
    console.log(`Found ${imageFiles.length.toLocaleString()} images\n`);
  } catch {
    console.warn('Image directory not found, proceeding without images\n');
  }

  // Create collections
  const collectionData = [
    { name: 'Main Archive', slug: 'archive-main', jpName: 'メインアーカイブ', season: 'ALL', year: 2024 },
    { name: 'Tokyo Aero', slug: 'tokyo-aero', jpName: '東京エアロ', season: 'SPRING', year: 2024 },
    { name: 'Shibuya Night', slug: 'shibuya-night', jpName: '渋谷ナイト', season: 'SUMMER', year: 2024 },
    { name: 'Akihabara Tech', slug: 'akihabara-tech', jpName: '秋葉原テック', season: 'FALL', year: 2024 },
    { name: 'Shinjuku Speed', slug: 'shinjuku-speed', jpName: '新宿スピード', season: 'WINTER', year: 2024 },
    { name: 'Ghost Edition', slug: 'ghost-edition', jpName: 'ゴーストエディション', season: 'LIMITED', year: 2025 },
    { name: 'Cyber Unit', slug: 'cyber-unit', jpName: 'サイバーユニット', season: 'SPRING', year: 2025 },
    { name: 'Neo Tokyo', slug: 'neo-tokyo', jpName: 'ネオ東京', season: 'SUMMER', year: 2025 },
  ];

  let collections: any[];
  const existing = await Collection.countDocuments();
  if (existing > 0) {
    collections = await Collection.find({}).lean();
    console.log(`Using ${collections.length} existing collections`);
  } else {
    collections = await Collection.insertMany(collectionData);
    console.log(`Created ${collections.length} collections`);
  }

  // Generate
  const BATCH_SIZE = 500;
  let totalInserted = 0;
  const searchDocs: any[] = [];

  console.log(`\nGenerating ${COUNT.toLocaleString()} shoes...\n`);

  for (let batchStart = 0; batchStart < COUNT; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, COUNT);
    const shoeDocs = [];

    for (let i = batchStart; i < batchEnd; i++) {
      const idx = START_ID + i;
      const market = generateMarketData(idx);
      const series = SERIES_NAMES[idx % SERIES_NAMES.length];
      const jpLabel = JP_LABELS[idx % JP_LABELS.length];
      const slug = `unit-${String(idx).padStart(4, '0')}`;
      const name = `UNIT ${String(idx).padStart(4, '0')}`;
      const collection = collections[idx % collections.length];

      const imgFile = imageFiles.length > 0 ? imageFiles[idx % imageFiles.length] : null;
      const imageUrl = imgFile ? `/assets/images/${imgFile}` : '';
      const thumbnailUrl = imgFile ? `/assets/images/${imgFile}` : '';

      shoeDocs.push({
        name,
        slug,
        sku: `TM-${String(idx).padStart(6, '0')}`,
        jpLabel,
        description: `The ${name} from the ${series} collection. Precision-engineered in Japan.`,
        jpDescription: `${series}コレクションの${name}。日本の精密技術で設計されました。`,
        primaryImage: imgFile ? {
          url: imageUrl, secureUrl: imageUrl,
          publicId: `tomodachi/shoes/${slug}/main`,
          width: 1200, height: 1200,
          format: imgFile.split('.').pop() || 'jpg', bytes: 0,
          thumbnailUrl,
          webpUrl: imageUrl.replace(/\.(jpg|jpeg|png|svg)$/, '.webp'),
          avifUrl: imageUrl.replace(/\.(jpg|jpeg|png|svg)$/, '.avif'),
          variant: 'main', alt: name,
        } : {},
        images: imgFile ? [{
          url: imageUrl, secureUrl: imageUrl,
          publicId: `tomodachi/shoes/${slug}/main`,
          width: 1200, height: 1200,
          format: imgFile.split('.').pop() || 'jpg', bytes: 0,
          thumbnailUrl,
          webpUrl: imageUrl.replace(/\.(jpg|jpeg|png|svg)$/, '.webp'),
          avifUrl: imageUrl.replace(/\.(jpg|jpeg|png|svg)$/, '.avif'),
          variant: 'main', alt: name,
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
        tags: [market.rarity.toLowerCase(), market.category].filter(Boolean),
        series,
        designer: DESIGNERS[idx % DESIGNERS.length],
        colorways: [COLORWAYS[idx % COLORWAYS.length]],
        materials: [MATERIALS[idx % MATERIALS.length]],
        technology: [TECHNOLOGIES[idx % TECHNOLOGIES.length]],
        weight: 180 + (idx % 120), weightUnit: 'g',
        origin: 'JAPAN', energyClass: market.energyClass,
        isActive: true, isFeatured: idx % 10 === 0,
      });

      searchDocs.push({
        id: slug, name, slug, series, jpLabel,
        rarity: market.rarity, price: market.price,
        resaleValue: market.resaleValue, stock: market.stock,
        status: market.status, region: market.region,
        imageUrl, thumbnailUrl,
        category: market.category, trend: market.trend,
        demandIndex: market.demandIndex,
        tags: [market.rarity.toLowerCase(), market.category],
        energyClass: market.energyClass, isActive: true,
      });
    }

    const inserted = await Shoe.insertMany(shoeDocs, { ordered: false });
    totalInserted += inserted.length;

    const pct = Math.round((batchEnd / COUNT) * 100);
    const barLen = 30;
    const filled = Math.round((batchEnd / COUNT) * barLen);
    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
    process.stdout.write(`\r[${bar}] ${pct}% — ${totalInserted.toLocaleString()} shoes inserted`);
  }

  console.log(`\n\n✅ Inserted ${totalInserted.toLocaleString()} shoes`);

  // Update collection stats
  console.log('Updating collection stats...');
  for (const collection of collections) {
    const stats = await Shoe.aggregate([
      { $match: { collectionId: collection._id, isActive: true } },
      { $group: { _id: null, count: { $sum: 1 }, totalValue: { $sum: '$market.price' } } },
    ]);
    if (stats.length > 0) {
      await Collection.findByIdAndUpdate(collection._id, {
        shoeCount: stats[0].count,
        totalValue: stats[0].totalValue,
      });
    }
  }

  // Index in Meilisearch
  if (ENABLE_MEILI) {
    try {
      console.log('Indexing in Meilisearch...');
      await createSearchIndex();
      for (let i = 0; i < searchDocs.length; i += 500) {
        await indexShoes(searchDocs.slice(i, i + 500));
      }
      console.log(`✅ Indexed ${searchDocs.length} documents in Meilisearch`);
    } catch (err) {
      console.warn('⚠️  Meilisearch indexing skipped:', err);
    }
  }

  // Summary
  const total = await Shoe.countDocuments({ isActive: true });
  const totalMarketCap = await Shoe.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, total: { $sum: '$market.marketCap' } } },
  ]);

  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║   SEED COMPLETE                      ║`);
  console.log(`╠══════════════════════════════════════╣`);
  console.log(`║ Total shoes:  ${String(total).padStart(8)}        ║`);
  console.log(`║ Collections:  ${String(collections.length).padStart(8)}        ║`);
  console.log(`║ Market cap:   ¥${((totalMarketCap[0]?.total || 0) / 10000).toFixed(0)}万     ║`);
  console.log(`║ Price range:  ¥89万 ~ 400万           ║`);
  console.log(`╚══════════════════════════════════════╝\n`);

  await disconnectDB();
  process.exit(0);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
