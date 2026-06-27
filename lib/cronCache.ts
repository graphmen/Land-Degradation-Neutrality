/**
 * Shared in-memory cache for Kobo data, populated by the cron sync route.
 * Stored here (not in the route file) so it can be imported by other routes
 * without violating Next.js App Router's rule that route files may only
 * export HTTP method handlers.
 */

export interface CronCacheEntry {
  records: any[];
  updatedAt: number;
}

export const cronCache: {
  ldn: CronCacheEntry | null;
  soil: CronCacheEntry | null;
} = {
  ldn: null,
  soil: null,
};
