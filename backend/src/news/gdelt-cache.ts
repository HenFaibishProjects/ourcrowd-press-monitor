import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BadGatewayException } from '@nestjs/common';

interface CachedResponse {
  version: 1;
  request: { companyName: string; query: string; from: string; to: string; url: string };
  fetchedAt: string;
  rawResponse: string;
}
export function gdeltCacheKey(url: string): string {
  return createHash('sha256').update(url).digest('hex');
}
export class GdeltCache {
  constructor(private readonly directory: string) {}
  async read(url: string): Promise<string | null> {
    let cacheJson: string;
    try { cacheJson = await readFile(join(this.directory, `${gdeltCacheKey(url)}.json`), 'utf8'); }
    catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw new BadGatewayException('Cannot read GDELT cache; check directory permissions');
    }
    try {
      const parsedCacheEntry: unknown = JSON.parse(cacheJson);
      if (!parsedCacheEntry || typeof parsedCacheEntry !== 'object') throw Error();
      const cacheEntry = parsedCacheEntry as Partial<CachedResponse>;
      if (cacheEntry.version !== 1 || cacheEntry.request?.url !== url || typeof cacheEntry.rawResponse !== 'string' ||
          typeof cacheEntry.fetchedAt !== 'string' || !Number.isFinite(Date.parse(cacheEntry.fetchedAt))) throw Error();
      return cacheEntry.rawResponse;
    } catch { throw new BadGatewayException('Invalid GDELT cache entry; rerun with --refresh or remove the entry'); }
  }
  async write(request: CachedResponse['request'], rawResponse: string): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const cacheFilePath = join(this.directory, `${gdeltCacheKey(request.url)}.json`);
    const temporaryFilePath = `${cacheFilePath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryFilePath, JSON.stringify({ version: 1, request, fetchedAt: new Date().toISOString(), rawResponse }, null, 2) + '\n');
      await rename(temporaryFilePath, cacheFilePath);
    } finally { await rm(temporaryFilePath, { force: true }); }
  }
}
