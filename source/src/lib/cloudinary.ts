/**
 * Cloudinary CDN image management for Tomodachi Shoes.
 * Images are never stored in MongoDB — only URLs and metadata.
 */

import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

export interface UploadResult {
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
}

export async function uploadShoeImage(
  filePath: string,
  shoeId: string,
  variant: 'main' | 'thumbnail' | 'detail' = 'main'
): Promise<UploadResult> {
  const ext = path.extname(filePath).toLowerCase();
  const isSvg = ext === '.svg';

  let uploadPath = filePath;

  // Convert non-SVG to WebP before upload
  if (!isSvg) {
    const webpPath = filePath.replace(ext, '.webp');
    await sharp(filePath)
      .webp({ quality: 82, effort: 6 })
      .toFile(webpPath);
    uploadPath = webpPath;
  }

  const publicId = `tomodachi/shoes/${shoeId}/${variant}`;

  const result = await cloudinary.uploader.upload(uploadPath, {
    public_id: publicId,
    folder: `tomodachi/shoes/${shoeId}`,
    resource_type: 'image',
    ...(isSvg ? { format: 'svg' } : { format: 'webp' }),
    transformation: [
      { quality: 'auto:good', fetch_format: 'auto' },
    ],
    eager: [
      { width: 120, height: 120, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
      { width: 600, quality: 'auto', fetch_format: 'auto' },
      { width: 1200, quality: 'auto', fetch_format: 'auto' },
    ],
    eager_async: true,
  });

  // Clean up temp webp
  if (!isSvg && uploadPath !== filePath) {
    await fs.unlink(uploadPath).catch(() => {});
  }

  return {
    url: result.url,
    secureUrl: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
    thumbnailUrl: result.eager?.[0]?.secure_url || '',
    webpUrl: `${result.secure_url.replace(/\.(jpg|png|svg)$/, '.webp')}`,
    avifUrl: `${result.secure_url.replace(/\.(jpg|png|svg)$/, '.avif')}`,
  };
}

export async function uploadBatchImages(
  files: string[],
  shoeId: string
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
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

export async function deleteShoeImages(shoeId: string): Promise<void> {
  try {
    await cloudinary.api.delete_resources_by_prefix(
      `tomodachi/shoes/${shoeId}/`
    );
  } catch (err) {
    console.error(`[Delete] Failed for shoe ${shoeId}:`, err);
  }
}

export function getOptimizedUrl(
  publicId: string,
  options: { width?: number; quality?: number; format?: string } = {}
): string {
  const { width = 800, quality = 80, format = 'auto' } = options;
  return cloudinary.url(publicId, {
    width,
    quality,
    fetch_format: format,
    crop: 'fit',
  });
}
