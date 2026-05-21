import { c as connectDB, S as Shoe } from './Shoe_DTpxLiNh.mjs';
import { C as Collection } from './Collection_CNv99q0L.mjs';
import { g as generateMarketData } from './market-sim_CDFBtqHE.mjs';
import { v2 } from 'cloudinary';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { c as createSearchIndex, i as indexShoes } from './meilisearch_DRNFvghT.mjs';

v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || ""
});
async function uploadShoeImage(filePath, shoeId, variant = "main") {
  const ext = path.extname(filePath).toLowerCase();
  const isSvg = ext === ".svg";
  let uploadPath = filePath;
  if (!isSvg) {
    const webpPath = filePath.replace(ext, ".webp");
    await sharp(filePath).webp({ quality: 82, effort: 6 }).toFile(webpPath);
    uploadPath = webpPath;
  }
  const publicId = `tomodachi/shoes/${shoeId}/${variant}`;
  const result = await v2.uploader.upload(uploadPath, {
    public_id: publicId,
    folder: `tomodachi/shoes/${shoeId}`,
    resource_type: "image",
    ...isSvg ? { format: "svg" } : { format: "webp" },
    transformation: [
      { quality: "auto:good", fetch_format: "auto" }
    ],
    eager: [
      { width: 120, height: 120, crop: "fill", quality: "auto", fetch_format: "auto" },
      { width: 600, quality: "auto", fetch_format: "auto" },
      { width: 1200, quality: "auto", fetch_format: "auto" }
    ],
    eager_async: true
  });
  if (!isSvg && uploadPath !== filePath) {
    await fs.unlink(uploadPath).catch(() => {
    });
  }
  return {
    url: result.url,
    secureUrl: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
    thumbnailUrl: result.eager?.[0]?.secure_url || "",
    webpUrl: `${result.secure_url.replace(/\.(jpg|png|svg)$/, ".webp")}`,
    avifUrl: `${result.secure_url.replace(/\.(jpg|png|svg)$/, ".avif")}`
  };
}
async function uploadBatchImages(files, shoeId) {
  const results = [];
  for (const file of files) {
    try {
      const result = await uploadShoeImage(file, shoeId);
      results.push(result);
    } catch (err) {
      console.error(`[Upload] Failed for ${file}:`, err);
    }
  }
  return results;
}

const POST = async ({ request }) => {
  try {
    await connectDB();
    const body = await request.json();
    const imageDir = body.imageDir || process.env.ASSETS_DIR || "./assets/images";
    const batchSize = Math.min(body.batchSize || 100, 1e3);
    const startIndex = body.startIndex || 0;
    const uploadToCDN = body.uploadToCDN ?? false;
    const files = await fs.readdir(imageDir);
    const imageFiles = files.filter((f) => /\.(jpg|jpeg|png|webp|svg|avif)$/i.test(f)).sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ""), 10) || 0;
      const numB = parseInt(b.replace(/[^0-9]/g, ""), 10) || 0;
      return numA - numB;
    });
    const batch = imageFiles.slice(startIndex, startIndex + batchSize);
    if (batch.length === 0) {
      return new Response(JSON.stringify({
        message: "No images found to process",
        totalImages: imageFiles.length
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    let defaultCollection = await Collection.findOne({ slug: "archive-main" });
    if (!defaultCollection) {
      defaultCollection = await Collection.create({
        name: "Main Archive",
        slug: "archive-main",
        jpName: "メインアーカイブ",
        description: "Primary Tomodachi Shoes archive collection",
        season: "ALL",
        year: (/* @__PURE__ */ new Date()).getFullYear(),
        isActive: true
      });
    }
    const shoeDocuments = [];
    const searchDocuments = [];
    for (let i = 0; i < batch.length; i++) {
      const file = batch[i];
      const filePath = path.join(imageDir, file);
      const shoeIndex = startIndex + i;
      const seed = shoeIndex + 1;
      const market = generateMarketData(seed);
      const imageUrl = `/assets/images/${file}`;
      const thumbnailUrl = `/assets/images/${file}`;
      const slug = `unit-${String(seed).padStart(4, "0")}`;
      const name = `UNIT ${String(seed).padStart(4, "0")}`;
      const jpLabel = ["速度", "加速", "未来", "都市", "運動", "革新", "疾走", "風"][seed % 8];
      const names = [
        "TOKYO AERO",
        "SHIBUYA NIGHT",
        "AKIHABARA TECH",
        "SHINJUKU SPEED",
        "GINZA LUXE",
        "HARAJUKU STREET",
        "OSAKA RUN",
        "NEO TOKYO",
        "CYBER UNIT",
        "GHOST EDITION"
      ];
      const series = names[seed % names.length];
      const shoeData = {
        name,
        slug,
        sku: `TM-${String(seed).padStart(6, "0")}`,
        jpLabel,
        description: `The ${name} from the ${series} collection. Engineered for the Neo-Tokyo streets.`,
        jpDescription: `${series}コレクションの${name}。ネオ東京のストリートのために設計されました。`,
        primaryImage: {
          url: imageUrl,
          secureUrl: imageUrl,
          publicId: `tomodachi/shoes/${slug}/main`,
          width: 1200,
          height: 1200,
          format: file.split(".").pop() || "jpg",
          bytes: 0,
          thumbnailUrl,
          webpUrl: imageUrl.replace(/\.(jpg|jpeg|png|svg)$/, ".webp"),
          avifUrl: imageUrl.replace(/\.(jpg|jpeg|png|svg)$/, ".avif"),
          variant: "main",
          alt: name
        },
        images: [
          {
            url: imageUrl,
            secureUrl: imageUrl,
            publicId: `tomodachi/shoes/${slug}/main`,
            width: 1200,
            height: 1200,
            format: file.split(".").pop() || "jpg",
            bytes: 0,
            thumbnailUrl,
            webpUrl: imageUrl.replace(/\.(jpg|jpeg|png|svg)$/, ".webp"),
            avifUrl: imageUrl.replace(/\.(jpg|jpeg|png|svg)$/, ".avif"),
            variant: "main",
            alt: name
          }
        ],
        market,
        release: {
          date: new Date(2024, seed % 12, seed % 28 + 1),
          season: ["SPRING", "SUMMER", "FALL", "WINTER"][seed % 4],
          year: 2024 + seed % 3,
          dropNumber: seed % 50 + 1,
          isExclusive: market.rarity === "MYTHIC" || market.rarity === "LEGENDARY",
          regionLock: market.region ? [market.region] : []
        },
        collectionId: defaultCollection._id,
        tags: [market.rarity.toLowerCase(), market.category, market.region?.toLowerCase()].filter(Boolean),
        series,
        designer: ["Yamamoto", "Tanaka", "Sato", "Nakamura", "Watanabe", "Ito"][seed % 6],
        colorways: ["BLACK/MATTE", "PURPLE/CHROME", "CRIMSON/BLACK", "WHITE/GHOST", "NEON/STEALTH"][seed % 5],
        materials: ["FLYKNIT", "TPU", "CARBON FIBER", "GORE-TEX", "PREMIUM LEATHER", "MESH"][seed % 6],
        technology: ["AIR ZOOM", "REACT FOAM", "CARBON PLATE", "ENERGY RETURN", "SHOCK ABSORPTION"][seed % 5],
        weight: 180 + seed % 120,
        weightUnit: "g",
        origin: "JAPAN",
        energyClass: market.energyClass,
        isActive: true,
        isFeatured: seed % 10 === 0,
        viewCount: Math.floor(Math.random() * 5e3),
        favoriteCount: Math.floor(Math.random() * 500)
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
        isActive: true
      };
      shoeDocuments.push(shoeData);
      searchDocuments.push(searchDoc);
    }
    const inserted = await Shoe.insertMany(shoeDocuments, { ordered: false });
    console.log(`[Import] Inserted ${inserted.length} shoes`);
    const totalValue = shoeDocuments.reduce((sum, s) => sum + s.market.price, 0);
    await Collection.findByIdAndUpdate(defaultCollection._id, {
      $inc: { shoeCount: inserted.length, totalValue }
    });
    try {
      await createSearchIndex();
      await indexShoes(searchDocuments);
      console.log(`[Import] Indexed ${searchDocuments.length} in Meilisearch`);
    } catch (meiliErr) {
      console.warn("[Import] Meilisearch indexing skipped (optional):", meiliErr);
    }
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
      cdnUploaded: cdnResults.length
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[API] POST /api/import/batch error:", err);
    return new Response(JSON.stringify({
      error: "Import failed",
      message: err instanceof Error ? err.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
