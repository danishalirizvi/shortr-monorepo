/**
 * Zookeeper-style distributed range-based ID allocator.
 *
 * Each server process atomically claims a block of RANGE_SIZE IDs from MongoDB.
 * Within that block, IDs are issued in-memory (no I/O per ID).
 * When the block is exhausted, the next block is claimed atomically.
 *
 * Because JavaScript is single-threaded, `currentId++` is atomic within the
 * process. The async mutex (`refreshingPromise`) ensures only one MongoDB
 * round-trip is made when multiple async callers arrive simultaneously at
 * an empty range boundary.
 */
import config from '../config';
import logger from '../utils/logger';
import { IdRange } from '../models/IdRange.model';

const RANGE_SIZE = config.urlShortener.idRangeSize;

// 62^6 = 56,800,235,584. Starting here guarantees all codes have 7 significant
// Base62 digits — no leading-zero padding (e.g. '1000000' not '0000000').
const COUNTER_SEED = Math.pow(62, 6);

// Module-level state — one range per process instance (correct for cluster mode)
let currentId = 0;
let rangeEnd = 0;
let refreshingPromise: Promise<void> | null = null;

export async function getNextId(): Promise<number> {
  if (currentId >= rangeEnd) {
    await ensureRangeRefreshed();
  }
  return currentId++;
}

async function ensureRangeRefreshed(): Promise<void> {
  // If another async caller already triggered a range claim, piggyback on it.
  if (refreshingPromise) return refreshingPromise;

  refreshingPromise = claimNewRange().finally(() => {
    refreshingPromise = null;
  });

  return refreshingPromise;
}

async function claimNewRange(): Promise<void> {
  // findOneAndUpdate with { new: false } returns the document BEFORE the $inc.
  // That pre-increment counter value is our range start.
  // seedIdRange() guarantees the document exists before any claim, so doc
  // will never be null here in normal operation.
  const doc = await IdRange.findOneAndUpdate(
    { _id: 'global' },
    { $inc: { counter: RANGE_SIZE } },
    { new: false, upsert: true },
  ).lean();

  const rangeStart = (doc as { counter?: number } | null)?.counter ?? COUNTER_SEED;
  currentId = rangeStart;
  rangeEnd  = rangeStart + RANGE_SIZE;

  logger.info('ID allocator claimed new range', { rangeStart, rangeEnd });
}

/**
 * Called once at startup. Uses $setOnInsert so it is a no-op on every
 * subsequent restart — it only sets the seed on the very first boot.
 */
export async function seedIdRange(): Promise<void> {
  await IdRange.updateOne(
    { _id: 'global' },
    { $setOnInsert: { counter: COUNTER_SEED } },
    { upsert: true },
  );
  logger.info('ID range seeded', { seed: COUNTER_SEED });
}
