import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IImageAsset {
  url: string;
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  thumbnailUrl: string;
  webpUrl: string;
  avifUrl: string;
  variant: 'main' | 'thumbnail' | 'detail' | 'gallery' | 'model';
  alt: string;
}

export interface IMarketData {
  price: number;
  priceFormatted: string;
  resaleValue: number;
  resaleFormatted: string;
  rarity: string;
  rarityScore: number;
  volatility: number;
  trend: string;
  stock: number;
  status: string;
  region: string;
  category: string;
  series: string;
  energyClass: string;
  marketCap: number;
  lastSaleChange: number;
  demandIndex: number;
}

export interface IModel3D {
  url: string;
  format: string;
  fileSize: number;
  polygonCount?: number;
  animationPresets: string[];
  materials: string[];
}

export interface IReleaseInfo {
  date: Date;
  season: string;
  year: number;
  dropNumber: number;
  isExclusive: boolean;
  regionLock: string[];
  collaborator?: string;
}

export interface IShoe extends Document {
  name: string;
  slug: string;
  sku: string;
  jpLabel: string;
  description: string;
  jpDescription: string;

  // Media
  images: IImageAsset[];
  primaryImage: IImageAsset;
  model3d: IModel3D[];

  // Market
  market: IMarketData;

  // Release
  release: IReleaseInfo;

  // Classification
  collectionId: mongoose.Types.ObjectId;
  tags: string[];
  designer: string;
  colorways: string[];
  materials: string[];
  technology: string[];

  // Specs
  weight: number;
  weightUnit: string;
  origin: string;
  energyClass: string;

  // Status
  isActive: boolean;
  isFeatured: boolean;
  isArchived: boolean;

  // Metadata
  viewCount: number;
  favoriteCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ImageAssetSchema = new Schema<IImageAsset>({
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
  variant: { type: String, enum: ['main', 'thumbnail', 'detail', 'gallery', 'model'], default: 'main' },
  alt: { type: String, default: '' },
}, { _id: false });

const MarketDataSchema = new Schema<IMarketData>({
  price: { type: Number, required: true, index: true },
  priceFormatted: { type: String },
  resaleValue: { type: Number, index: true },
  resaleFormatted: { type: String },
  rarity: { type: String, enum: ['COMMON', 'LIMITED', 'RARE', 'LEGENDARY', 'MYTHIC'], index: true },
  rarityScore: { type: Number },
  volatility: { type: Number },
  trend: { type: String, enum: ['bullish', 'stable', 'bearish'] },
  stock: { type: Number, index: true },
  status: { type: String, enum: ['ACTIVE', 'ARCHIVED', 'PENDING'], index: true },
  region: { type: String, index: true },
  category: { type: String, index: true },
  series: { type: String, index: true },
  energyClass: { type: String },
  marketCap: { type: Number },
  lastSaleChange: { type: Number },
  demandIndex: { type: Number },
}, { _id: false });

const Model3DSchema = new Schema<IModel3D>({
  url: { type: String },
  format: { type: String },
  fileSize: { type: Number },
  polygonCount: { type: Number },
  animationPresets: [{ type: String }],
  materials: [{ type: String }],
}, { _id: false });

const ReleaseInfoSchema = new Schema<IReleaseInfo>({
  date: { type: Date },
  season: { type: String },
  year: { type: Number },
  dropNumber: { type: Number },
  isExclusive: { type: Boolean, default: false },
  regionLock: [{ type: String }],
  collaborator: { type: String },
}, { _id: false });

const ShoeSchema = new Schema<IShoe>({
  name: { type: String, required: true, index: 'text' },
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

  collectionId: { type: Schema.Types.ObjectId, ref: 'Collection', index: true },
  tags: [{ type: String, index: true }],
  designer: { type: String },
  colorways: [{ type: String }],
  materials: [{ type: String }],
  technology: [{ type: String }],

  weight: { type: Number },
  weightUnit: { type: String, default: 'g' },
  origin: { type: String },
  energyClass: { type: String },

  isActive: { type: Boolean, default: true, index: true },
  isFeatured: { type: Boolean, default: false, index: true },
  isArchived: { type: Boolean, default: false, index: true },

  viewCount: { type: Number, default: 0 },
  favoriteCount: { type: Number, default: 0 },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound indexes for common queries
ShoeSchema.index({ 'market.rarity': 1, 'market.price': 1 });
ShoeSchema.index({ 'market.region': 1, 'market.status': 1 });
ShoeSchema.index({ 'release.year': 1, 'release.season': 1 });
ShoeSchema.index({ tags: 1, 'market.category': 1 });
ShoeSchema.index({ slug: 1, isActive: 1 });
ShoeSchema.index({ createdAt: -1 });
ShoeSchema.index({ 'market.demandIndex': -1 });
ShoeSchema.index({ 'market.resaleValue': -1 });

// Text index for full-text search fallback
ShoeSchema.index({
  name: 'text',
  jpLabel: 'text',
  description: 'text',
  designer: 'text',
  tags: 'text',
}, {
  weights: { name: 10, jpLabel: 8, tags: 5, designer: 3, description: 1 },
  name: 'shoe_text_index',
});

export const Shoe: Model<IShoe> = mongoose.model<IShoe>('Shoe', ShoeSchema);
