import mongoose, { Schema } from 'mongoose';

let cached = null;
async function connectDB() {
  if (cached) return cached;
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/tomodachi-shoes";
  try {
    await mongoose.connect(uri, {
      maxPoolSize: 50,
      minPoolSize: 10,
      socketTimeoutMS: 3e4,
      serverSelectionTimeoutMS: 5e3,
      heartbeatFrequencyMS: 1e4
    });
    mongoose.connection.on("error", (err) => {
      console.error("[DB] Connection error:", err);
    });
    mongoose.connection.on("disconnected", () => {
      console.warn("[DB] Disconnected");
      cached = null;
    });
    cached = mongoose.connection;
    console.log("[DB] Connected to MongoDB");
    return cached;
  } catch (err) {
    console.error("[DB] Failed to connect:", err);
    throw err;
  }
}

const ImageAssetSchema = new Schema({
  url: { type: String, required: true },
  secureUrl: { type: String },
  publicId: { type: String },
  width: { type: Number },
  height: { type: Number },
  format: { type: String },
  bytes: { type: Number },
  thumbnailUrl: { type: String },
  webpUrl: { type: String },
  avifUrl: { type: String },
  variant: { type: String, enum: ["main", "thumbnail", "detail", "gallery", "model"], default: "main" },
  alt: { type: String, default: "" }
}, { _id: false });
const MarketDataSchema = new Schema({
  price: { type: Number, required: true, index: true },
  priceFormatted: { type: String },
  resaleValue: { type: Number, index: true },
  resaleFormatted: { type: String },
  rarity: { type: String, enum: ["COMMON", "LIMITED", "RARE", "LEGENDARY", "MYTHIC"], index: true },
  rarityScore: { type: Number },
  volatility: { type: Number },
  trend: { type: String, enum: ["bullish", "stable", "bearish"] },
  stock: { type: Number, index: true },
  status: { type: String, enum: ["ACTIVE", "ARCHIVED", "PENDING"], index: true },
  region: { type: String, index: true },
  category: { type: String, index: true },
  series: { type: String, index: true },
  energyClass: { type: String },
  marketCap: { type: Number },
  lastSaleChange: { type: Number },
  demandIndex: { type: Number }
}, { _id: false });
const Model3DSchema = new Schema({
  url: { type: String },
  format: { type: String },
  fileSize: { type: Number },
  polygonCount: { type: Number },
  animationPresets: [{ type: String }],
  materials: [{ type: String }]
}, { _id: false });
const ReleaseInfoSchema = new Schema({
  date: { type: Date },
  season: { type: String },
  year: { type: Number },
  dropNumber: { type: Number },
  isExclusive: { type: Boolean, default: false },
  regionLock: [{ type: String }],
  collaborator: { type: String }
}, { _id: false });
const ShoeSchema = new Schema({
  name: { type: String, required: true, index: "text" },
  slug: { type: String, required: true, unique: true, index: true },
  sku: { type: String, unique: true, index: true },
  jpLabel: { type: String },
  description: { type: String },
  jpDescription: { type: String },
  images: [ImageAssetSchema],
  primaryImage: { type: ImageAssetSchema },
  model3d: [Model3DSchema],
  market: { type: MarketDataSchema, required: true },
  release: { type: ReleaseInfoSchema },
  collectionId: { type: Schema.Types.ObjectId, ref: "Collection", index: true },
  tags: [{ type: String, index: true }],
  designer: { type: String },
  colorways: [{ type: String }],
  materials: [{ type: String }],
  technology: [{ type: String }],
  weight: { type: Number },
  weightUnit: { type: String, default: "g" },
  origin: { type: String },
  energyClass: { type: String },
  isActive: { type: Boolean, default: true, index: true },
  isFeatured: { type: Boolean, default: false, index: true },
  isArchived: { type: Boolean, default: false, index: true },
  viewCount: { type: Number, default: 0 },
  favoriteCount: { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
ShoeSchema.index({ "market.rarity": 1, "market.price": 1 });
ShoeSchema.index({ "market.region": 1, "market.status": 1 });
ShoeSchema.index({ "release.year": 1, "release.season": 1 });
ShoeSchema.index({ tags: 1, "market.category": 1 });
ShoeSchema.index({ slug: 1, isActive: 1 });
ShoeSchema.index({ createdAt: -1 });
ShoeSchema.index({ "market.demandIndex": -1 });
ShoeSchema.index({ "market.resaleValue": -1 });
ShoeSchema.index({
  name: "text",
  jpLabel: "text",
  description: "text",
  designer: "text",
  tags: "text"
}, {
  weights: { name: 10, jpLabel: 8, tags: 5, designer: 3, description: 1 },
  name: "shoe_text_index"
});
const Shoe = mongoose.model("Shoe", ShoeSchema);

export { Shoe as S, connectDB as c };
