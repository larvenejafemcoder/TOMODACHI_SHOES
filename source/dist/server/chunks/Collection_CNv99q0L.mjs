import mongoose, { Schema } from 'mongoose';

const CollectionSchema = new Schema({
  name: { type: String, required: true, index: "text" },
  slug: { type: String, required: true, unique: true, index: true },
  jpName: { type: String },
  description: { type: String },
  jpDescription: { type: String },
  imageUrl: { type: String },
  bannerUrl: { type: String },
  logoUrl: { type: String },
  season: { type: String, index: true },
  year: { type: Number, index: true },
  designer: { type: String },
  region: { type: String, index: true },
  shoeCount: { type: Number, default: 0 },
  totalValue: { type: Number, default: 0 },
  avgRarity: { type: String },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  isLimited: { type: Boolean, default: false },
  metaTitle: { type: String },
  metaDescription: { type: String },
  tags: [{ type: String, index: true }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
CollectionSchema.index({ year: -1, season: 1 });
CollectionSchema.index({ isFeatured: 1, isActive: 1 });
CollectionSchema.index({ name: "text", jpName: "text", description: "text" });
const Collection = mongoose.model("Collection", CollectionSchema);

export { Collection as C };
