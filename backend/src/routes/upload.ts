import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import sharp from 'sharp';
import multipart from '@fastify/multipart';

const UPLOAD_DIR = '/app/uploads';
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_LONG_EDGE = 1200;  // upscale smaller images to this
const MAX_LONG_EDGE = 2000;  // downscale larger images to this

/** Ensure upload subdirectories exist */
function ensureDir(type: string) {
  const dir = join(UPLOAD_DIR, type);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export async function uploadRoutes(app: FastifyInstance) {
  // Register multipart plugin
  await app.register(multipart, {
    limits: {
      fileSize: MAX_SIZE,
      files: 1,
    },
  });

  /** POST /api/upload — upload an image, returns WebP URL */
  app.post('/api/upload', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await (req as any).file();
      if (!data) {
        return reply.status(400).send({ error: 'No file provided' });
      }

      // Validate file type
      const mimetype = data.mimetype || '';
      if (!mimetype.startsWith('image/')) {
        return reply.status(400).send({ error: 'Only image files allowed' });
      }

      // Read file buffer
      const buffer = await data.toBuffer();

      // Validate image via sharp
      let metadata;
      try {
        metadata = await sharp(buffer).metadata();
      } catch {
        return reply.status(400).send({ error: 'Invalid or corrupted image' });
      }
      if (!metadata.width || !metadata.height) {
        return reply.status(400).send({ error: 'Could not read image dimensions' });
      }

      // Normalize: upscale tiny images, downscale huge ones, always WebP
      const longestEdge = Math.max(metadata.width, metadata.height);
      let resizeOpts: sharp.ResizeOptions = { withoutEnlargement: false };
      if (longestEdge > MAX_LONG_EDGE) {
        // Downscale so longest edge = MAX_LONG_EDGE
        resizeOpts = { width: metadata.width >= metadata.height ? MAX_LONG_EDGE : undefined, height: metadata.height > metadata.width ? MAX_LONG_EDGE : undefined, fit: 'inside', withoutEnlargement: true };
      } else if (longestEdge < MIN_LONG_EDGE) {
        // Upscale so longest edge = MIN_LONG_EDGE
        resizeOpts = { width: metadata.width >= metadata.height ? MIN_LONG_EDGE : undefined, height: metadata.height > metadata.width ? MIN_LONG_EDGE : undefined, fit: 'inside', withoutEnlargement: false };
      }

      // Determine upload type
      const type: string = (req as any).params?.type || (req.query as any)?.type || 'photos';
      const dir = ensureDir(type);
      const filename = `${randomUUID()}`;
      const webpPath = join(dir, `${filename}.webp`);

      // Resize → WebP quality 85 → write
      await sharp(buffer)
        .resize(resizeOpts)
        .webp({ quality: 85, effort: 4 })
        .toFile(webpPath);

      console.log(`  ✅ Uploaded: ${type}/${filename}.webp (${resizeOpts.width || 'auto'}×${resizeOpts.height || 'auto'} → WebP)`);

      const result: { url: string; jpegUrl?: string } = {
        url: `/uploads/${type}/${filename}.webp`,
      };

      // FR-03/BUG-29: generate JPEG alongside WebP for Telegram Bot API (sendPhoto rejects WebP)
      if (type === 'mockups') {
        const jpegPath = join(dir, `${filename}.jpg`);
        await sharp(buffer)
          .resize(resizeOpts)
          .jpeg({ quality: 88, mozjpeg: true })
          .toFile(jpegPath);
        result.jpegUrl = `/uploads/${type}/${filename}.jpg`;
        console.log(`  ✅ Uploaded: ${type}/${filename}.jpg (JPEG for Telegram)`);
      }

      return result;
    } catch (err: any) {
      req.log.error(err, 'Upload failed');
      return reply.status(500).send({ error: err?.message || 'Upload failed' });
    }
  });
}
