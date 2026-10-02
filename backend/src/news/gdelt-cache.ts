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
    let text: string;
    try { text = await readFile(join(this.directory, `${gdeltCacheKey(url)}.json`), 'utf8'); }
    catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw new BadGatewayException('Cannot read GDELT cache; check directory permissions');
    }
    try {
      const record: unknown = JSON.parse(text);
      if (!record || typeof record !== 'object') throw Error();
      const cached = record as Partial<CachedResponse>;
      if (cached.version !== 1 || cached.request?.url !== url || typeof cached.rawResponse !== 'string' ||
          typeof cached.fetchedAt !== 'string' || !Number.isFinite(Date.parse(cached.fetchedAt))) throw Error();
      return cached.rawResponse;
    } catch { throw new BadGatewayException('Invalid GDELT cache entry; rerun with --refresh or remove the entry'); }
  }
  async write(request: CachedResponse['request'], rawResponse: string): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const target = join(this.directory, `${gdeltCacheKey(request.url)}.json`);
    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify({ version: 1, request, fetchedAt: new Date().toISOString(), rawResponse }, null, 2) + '\n');
      await rename(temporary, target);
    } finally { await rm(temporary, { force: true }); }
  }
}
