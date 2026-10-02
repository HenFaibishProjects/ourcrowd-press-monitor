import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OllamaConfig { baseUrl: string; model: string; timeoutMs: number }

export function ollamaConfig(configService: ConfigService): OllamaConfig {
  const baseUrl = configService.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434').trim();
  const model = configService.get<string>('OLLAMA_MODEL', 'gemma3:270m').trim();
  const timeoutText = configService.get<string>('OLLAMA_TIMEOUT_MS', '60000');
  const timeoutMs = Number(timeoutText);
  let url: URL;
  try { url = new URL(baseUrl); }
  catch { throw new InternalServerErrorException('OLLAMA_BASE_URL must be a valid loopback HTTP URL'); }
  if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new InternalServerErrorException('OLLAMA_BASE_URL must point directly to local Ollama on localhost, 127.0.0.1 or [::1]; hosted endpoints are not allowed');
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/.test(model) || /(?:^|[:_-])cloud(?:$|[:_-])/i.test(model)) {
    throw new InternalServerErrorException('OLLAMA_MODEL must name a local model, without whitespace or a cloud tag');
  }
  if (!/^\d+$/.test(timeoutText) || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300000) {
    throw new InternalServerErrorException('OLLAMA_TIMEOUT_MS must be an integer from 1 to 300000');
  }
  return { baseUrl: url.origin, model, timeoutMs };
}
