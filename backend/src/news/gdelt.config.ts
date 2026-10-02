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

export function gdeltConfig(configService: ConfigService): GdeltConfig {
  const integerSetting = (
    settingName: string,
    defaultValue: number,
    minimum: number,
    maximum: number,
  ) => {
    const settingText = String(configService.get(settingName) ?? defaultValue);
    const settingNumber = Number(settingText);

    if (
      !/^\d+$/.test(settingText) ||
      !Number.isSafeInteger(settingNumber) ||
      settingNumber < minimum ||
      settingNumber > maximum
    ) {
      throw new InternalServerErrorException(
        `${settingName} must be an integer from ${minimum} to ${maximum}`,
      );
    }

    return settingNumber;
  };
  let url: URL;

  try {
    url = new URL(
      configService.get<string>('GDELT_BASE_URL') ?? 'https://api.gdeltproject.org/api/v2/doc/doc',
    );
  } catch {
    throw new InternalServerErrorException('GDELT_BASE_URL must be an absolute HTTP(S) endpoint');
  }

  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new InternalServerErrorException(
      'GDELT_BASE_URL must be HTTP(S), without credentials, query or fragment',
    );
  }

  const cachePath = configService.get<string>('GDELT_CACHE_PATH') ?? 'data/cache/gdelt';

  if (!cachePath.trim()) {
    throw new InternalServerErrorException('GDELT_CACHE_PATH must not be blank');
  }

  return {
    baseUrl: url.toString(),
    timeoutMs: integerSetting('GDELT_TIMEOUT_MS', 30000, 1, 300000),
    requestDelayMs: integerSetting('GDELT_REQUEST_DELAY_MS', 7000, 0, 60000),
    maxRetries: integerSetting('GDELT_MAX_RETRIES', 2, 0, 3),
    cachePath: resolve(__dirname, '../../..', cachePath),
  };
}
