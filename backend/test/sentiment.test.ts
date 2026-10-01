import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { BadGatewayException, BadRequestException, GatewayTimeoutException, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Sentiment } from '../src/mentions/sentiment.enum';
import { OllamaSentimentClassifier, SENTIMENT_PROMPT } from '../src/sentiment/ollama-sentiment.classifier';

const input = { companyName: 'Test company', title: 'Test title', description: 'Test excerpt' };
function classifier(extra: Record<string, string> = {}): OllamaSentimentClassifier {
  return new OllamaSentimentClassifier(new ConfigService({ OLLAMA_BASE_URL: 'http://localhost:11434', OLLAMA_MODEL: 'gemma3:270m', OLLAMA_TIMEOUT_MS: '1000', ...extra }));
}
function output(value: unknown): Response {
  return Response.json({ done: true, response: typeof value === 'string' ? value : JSON.stringify(value) });
}
afterEach(() => mock.restoreAll());

for (const sentiment of Object.values(Sentiment)) {
  test(`valid ${sentiment} output becomes the domain enum and sends a local structured request`, async () => {
    const http = mock.method(globalThis, 'fetch', async (url: string | URL | Request, init?: RequestInit) => {
      assert.equal(url, 'http://localhost:11434/api/generate');
      assert.equal(init?.method, 'POST');
      assert.equal(init?.redirect, 'error');
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      assert.equal(body['model'], 'gemma3:270m');
      assert.equal(body['system'], SENTIMENT_PROMPT);
      assert.deepEqual(JSON.parse(String(body['prompt'])), input);
      assert.equal(body['stream'], false);
      assert.deepEqual(body['options'], { temperature: 0, seed: 42, num_predict: 64 });
      assert.deepEqual(body['format'], { type: 'object', properties: { sentiment: { type: 'string', enum: Object.values(Sentiment) } }, required: ['sentiment'], additionalProperties: false });
      return output({ sentiment });
    });
    assert.equal(await classifier().classify(input), sentiment);
    assert.equal(http.mock.callCount(), 1);
  });
}

test('malformed JSON, invalid values and extra fields fail without retries or neutral fallback', async () => {
  const values = ['not JSON', '{', '```json\n{"sentiment":"POSITIVE"}\n```', { sentiment: 'positive' }, { sentiment: 'MIXED' }, { sentiment: 'NEUTRAL', explanation: 'extra' }, ['POSITIVE'], null];
  for (const value of values) {
    const http = mock.method(globalThis, 'fetch', async () => output(value));
    await assert.rejects(classifier().classify(input), BadGatewayException);
    assert.equal(http.mock.callCount(), 1);
    http.mock.restore();
  }
});

test('invalid or incomplete Ollama envelopes and non-JSON HTTP bodies fail', async () => {
  for (const body of [{ done: false, response: '{"sentiment":"NEUTRAL"}' }, { done: true }, { done: true, response: 1 }]) {
    const http = mock.method(globalThis, 'fetch', async () => Response.json(body));
    await assert.rejects(classifier().classify(input), BadGatewayException);
    http.mock.restore();
  }
  mock.method(globalThis, 'fetch', async () => new Response('not JSON'));
  await assert.rejects(classifier().classify(input), BadGatewayException);
});

test('Ollama HTTP failure surfaces 502; connection failure surfaces 503; neither retries', async () => {
  const http = mock.method(globalThis, 'fetch', async () => new Response('not found', { status: 404 }));
  await assert.rejects(classifier().classify(input), BadGatewayException);
  assert.equal(http.mock.callCount(), 1);
  http.mock.restore();
  const unavailable = mock.method(globalThis, 'fetch', async () => { throw new TypeError('connection refused'); });
  await assert.rejects(classifier().classify(input), ServiceUnavailableException);
  assert.equal(unavailable.mock.callCount(), 1);
});

test('timeout aborts the HTTP boundary and surfaces 504', async () => {
  const http = mock.method(globalThis, 'fetch', (_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }));
  await assert.rejects(classifier({ OLLAMA_TIMEOUT_MS: '10' }).classify(input), GatewayTimeoutException);
  assert.equal(http.mock.callCount(), 1);
});

test('invalid input makes no HTTP request, while null description is accepted', async () => {
  const http = mock.method(globalThis, 'fetch', async () => output({ sentiment: 'NEUTRAL' }));
  await assert.rejects(classifier().classify({ ...input, title: '  ' }), BadRequestException);
  await assert.rejects(classifier().classify({ ...input, companyName: '' }), BadRequestException);
  await assert.rejects(classifier().classify({ ...input, description: 'x'.repeat(4001) }), BadRequestException);
  assert.equal(http.mock.callCount(), 0);
  assert.equal(await classifier().classify({ ...input, description: null }), Sentiment.NEUTRAL);
});

test('invalid config, hosted URLs and cloud-tagged models are rejected before HTTP', () => {
  const invalidConfigs: Array<Record<string, string>> = [
    { OLLAMA_BASE_URL: 'not a url' }, { OLLAMA_BASE_URL: 'https://ollama.com' },
    { OLLAMA_BASE_URL: 'http://localhost:11434/api' }, { OLLAMA_BASE_URL: 'http://user:password@localhost:11434' },
    { OLLAMA_MODEL: '' }, { OLLAMA_MODEL: 'gpt-oss:120b-cloud' }, { OLLAMA_MODEL: 'model:cloud' },
    { OLLAMA_TIMEOUT_MS: '0' }, { OLLAMA_TIMEOUT_MS: 'NaN' }, { OLLAMA_TIMEOUT_MS: '1.5' },
  ];
  for (const extra of invalidConfigs) assert.throws(() => classifier(extra), InternalServerErrorException);
});
