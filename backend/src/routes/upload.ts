import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import sharp from 'sharp';
import multipart from '@fastify/multipart';

const UPLOAD_DIR = '/app/uploads';
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_DIM = 1200;

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

      // Validate dimensions via sharp
      let metadata;
      try {
        metadata = await sharp(buffer).metadata();
      } catch {
        return reply.status(400).send({ error: 'Invalid or corrupted image' });
      }
      if (!metadata.width || !metadata.height) {
        return reply.status(400).send({ error: 'Could not read image dimensions' });
      }
      if (metadata.width < MIN_DIM || metadata.height < MIN_DIM) {
        return reply.status(400).send({ error: `Image must be at least ${MIN_DIM}×${MIN_DIM}px` });
      }

      // Determine upload type: mockup or photo
      const type = (req.query as any).type || 'photos';
      const dir = ensureDir(type);

      // Convert to WebP and save
      const filename = `${randomUUID()}.webp`;
      const outputPath = join(dir, filename);

      await sharp(buffer)
        .webp({ quality: 85 })
        .toFile(outputPath);

      const url = `/uploads/${type}/${filename}`;
      return { url };
    } catch (err: any) {
      req.log.error(err, 'Upload failed');
      return reply.status(500).send({ error: err?.message || 'Upload failed' });
    }
  });
}
