import config from '../config';
import AppError from '../utils/AppError';
import { encode } from '../utils/base62';
import { getNextId } from './idAllocator.service';
import { ShortUrl } from '../models/ShortUrl.model';
import { getRedisClient } from '../infrastructure/redis';
import logger from '../utils/logger';
import { Click } from '../models/Click.model';

const CACHE_TTL_SECONDS = 86_400; // 24 hours

export async function createShortUrl(
  originalUrl: string,
  creatorIp: string,
): Promise<{ shortCode: string; shortUrl: string }> {
  // Validate URL — throws if malformed
  try {
    const parsed = new URL(originalUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('only http/https allowed');
    }
  } catch {
    throw new AppError('Invalid URL. Must be a valid http or https URL.', 400, 'INVALID_URL');
  }

  const id        = await getNextId();
  const shortCode = encode(id);

  await ShortUrl.create({ shortCode, originalUrl, createdByIp: creatorIp });

  const shortUrl = `${config.app.baseUrl}/${shortCode}`;
  return { shortCode, shortUrl };
}

export async function resolveShortUrl(shortCode: string): Promise<string | null> {
  const redis = getRedisClient();

  // 1. Cache-aside: try Redis first
  try {
    const cached = await redis.get(shortCode);
    if (cached) {
      logger.debug('Cache hit', { shortCode });
      return cached;
    }
  } catch (err) {
    // Redis is down or unavailable — log and fall through to MongoDB
    logger.warn('Redis read failed, falling through to DB', {
      shortCode,
      error: (err as Error).message,
    });
  }

  // 2. Query MongoDB
  const doc = await ShortUrl.findOne({ shortCode }).lean();
  if (!doc) return null;

  // 3. Write-back to Redis (fire-and-forget — don't let a cache write block the redirect)
  redis.set(shortCode, doc.originalUrl, 'EX', CACHE_TTL_SECONDS).catch((err: Error) => {
    logger.warn('Redis write-back failed', { shortCode, error: err.message });
  });

  return doc.originalUrl;
}

export async function getShortUrlAnalytics(shortCode: string) {
  const shortUrlDoc = await ShortUrl.findOne({ shortCode }).lean();
  if (!shortUrlDoc) {
    return null;
  }

  const totalClicks = await Click.countDocuments({ shortCode });

  const recentClicks = await Click.find({ shortCode })
    .sort({ timestamp: -1 })
    .limit(5)
    .lean();

  return {
    shortCode: shortUrlDoc.shortCode,
    originalUrl: shortUrlDoc.originalUrl,
    createdAt: shortUrlDoc.createdAt,
    totalClicks,
    recentClicks: recentClicks.map(click => ({
      ip: click.ip,
      userAgent: click.userAgent,
      timestamp: click.timestamp,
    })),
  };
}
