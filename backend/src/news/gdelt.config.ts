import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'node:path';

export interface GdeltConfig {
  baseUrl: string;
  timeoutMs: number;
  requestDelayMs: number;
  maxRetries: number;
  cachePath: string;
}
export function gdeltConfig(config: ConfigService): GdeltConfig {
  const number = (key: string, fallback: number, min: number, max: number) => {
    const raw = String(config.get(key) ?? fallback);
    const value = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < min || value > max) {
      throw new InternalServerErrorException(`${key} must be an integer from ${min} to ${max}`);
    }
    return value;
  };
  let url: URL;
  try { url = new URL(config.get<string>('GDELT_BASE_URL') ?? 'https://api.gdeltproject.org/api/v2/doc/doc'); }
  catch { throw new InternalServerErrorException('GDELT_BASE_URL must be an absolute HTTP(S) endpoint'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new InternalServerErrorException('GDELT_BASE_URL must be HTTP(S), without credentials, query or fragment');
  }
  const cachePath = config.get<string>('GDELT_CACHE_PATH') ?? 'data/cache/gdelt';
  if (!cachePath.trim()) throw new InternalServerErrorException('GDELT_CACHE_PATH must not be blank');
  return {
    baseUrl: url.toString(), timeoutMs: number('GDELT_TIMEOUT_MS', 30000, 1, 300000),
    requestDelayMs: number('GDELT_REQUEST_DELAY_MS', 1000, 0, 60000),
    maxRetries: number('GDELT_MAX_RETRIES', 2, 0, 3),
    cachePath: resolve(__dirname, '../../..', cachePath),
  };
}
