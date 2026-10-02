import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BadGatewayException, BadRequestException, GatewayTimeoutException, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GdeltNewsProvider, gdeltDate, gdeltRequest, parseGdeltResponse } from '../src/news/gdelt-news.provider';
import { gdeltConfig } from '../src/news/gdelt.config';
import { gdeltCacheKey } from '../src/news/gdelt-cache';
import { NewsDiagnostics, NewsSearchInput } from '../src/news/news-provider';
import { normalizeArticleUrl } from '../src/news/url-normalization';

const input: NewsSearchInput = { companyName: 'BioCatch', queryName: 'BioCatch', from: new Date('2026-07-01T00:00:00Z'), to: new Date('2026-10-01T00:00:00Z') };
const row = { title: '  News boundary fixture  ', url: 'https://NEWS.EXAMPLE/story?id=7&utm_source=test#section', seendate: '20260920T120000Z', tone: '-99' };
const response = () => new Response(JSON.stringify({ articles: [row] }));
async function boundary(run: (provider: GdeltNewsProvider, directory: string) => Promise<void>, http: typeof fetch, settings: Record<string, unknown> = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'gdelt-test-'));
  const original = globalThis.fetch; globalThis.fetch = http;
  try { await run(new GdeltNewsProvider(new ConfigService({ GDELT_CACHE_PATH: directory, GDELT_REQUEST_DELAY_MS: 0, GDELT_MAX_RETRIES: 2, ...settings })), directory); }
  finally { globalThis.fetch = original; await rm(directory, { force: true, recursive: true }); }
}

test('GDELT uses encoded exact phrase, fixed mode/sort/limit and UTC date parameters', () => {
  const config = gdeltConfig(new ConfigService());
  const url = gdeltRequest(config, { ...input, queryName: 'Safe Superintelligence & Labs' });
  assert.equal(url.searchParams.get('query'), '"Safe Superintelligence & Labs"');
  assert.equal(url.searchParams.get('mode'), 'ArtList'); assert.equal(url.searchParams.get('format'), 'json');
  assert.equal(url.searchParams.get('sort'), 'DateDesc'); assert.equal(url.searchParams.get('maxrecords'), '250');
  assert.equal(url.searchParams.get('startdatetime'), '20260701000000'); assert.equal(url.searchParams.get('enddatetime'), '20261001000000');
  assert(url.toString().includes('%26')); assert.equal(gdeltDate(new Date('2026-07-01T03:00:00+03:00')), '20260701000000');
  for (const queryName of ['', 'A" OR B', 'A\nB']) assert.throws(() => gdeltRequest(config, { ...input, queryName }), BadRequestException);
  assert.throws(() => gdeltRequest(config, { ...input, to: input.from }), BadRequestException);
  assert.throws(() => gdeltDate(new Date('invalid')), BadRequestException);
});

test('GDELT maps valid articles, ignores tone, skips invalid rows and filters exclusive end', () => {
  const result = parseGdeltResponse(JSON.stringify({ articles: [row, { ...row, seendate: '20261001T000000Z' },
    { ...row, seendate: '20260230T120000Z' }, { ...row, title: ' ' }, null] }), input);
  assert.equal(result.articles.length, 1); assert.equal(result.invalidArticles, 3);
  assert.deepEqual(result.articles[0], { title: 'News boundary fixture', url: 'https://news.example/story?id=7',
    source: 'news.example', publishedAt: new Date('2026-09-20T12:00:00Z'), description: null });
  assert.deepEqual(parseGdeltResponse('{"articles":[]}', input), { articles: [], invalidArticles: 0, resultLimitReached: false });
  for (const raw of ['bad json', '{}', 'null', '{"articles":{}}']) assert.throws(() => parseGdeltResponse(raw, input), BadGatewayException);
});

test('URL normalization removes only known trackers and fragments, retaining identity query bytes', () => {
  assert.equal(normalizeArticleUrl(' HTTPS://NEWS.EXAMPLE/a?article=1&x=a%20b&utm_source=abc&FBCLID=xyz#part '), 'https://news.example/a?article=1&x=a%20b');
  assert.equal(normalizeArticleUrl('https://n.example/a?gclid=z&id=1&utm_medium=x&utm_campaign=x&utm_term=x&utm_content=x'), 'https://n.example/a?id=1');
  assert.notEqual(normalizeArticleUrl('https://n.example/a?id=1'), normalizeArticleUrl('https://n.example/a?id=2'));
  for (const value of ['bad', 'file:///etc/passwd', 'https://user:pass@n.example/a']) assert.throws(() => normalizeArticleUrl(value), BadRequestException);
});

test('cache miss fetches raw response, hit avoids HTTP, refresh replaces and live bypasses', async () => {
  let calls = 0; const diagnostics: NewsDiagnostics[] = [];
  await boundary(async (provider, directory) => {
    const search = { ...input, onDiagnostics: (details: NewsDiagnostics) => diagnostics.push(details) };
    assert.equal((await provider.search(search)).length, 1); assert.equal(calls, 1);
    await provider.search(search); assert.equal(calls, 1);
    await provider.search({ ...search, cacheMode: 'refresh' }); assert.equal(calls, 2);
    const entries = await readdir(directory); assert.equal(entries.length, 1);
    const cached = JSON.parse(await readFile(join(directory, entries[0]!), 'utf8'));
    assert.equal(cached.request.companyName, 'BioCatch'); assert.equal(cached.request.query, '"BioCatch"');
    assert.equal(cached.request.from, input.from.toISOString()); assert.equal(cached.request.to, input.to.toISOString());
    assert.equal(JSON.parse(cached.rawResponse).articles[0].title, row.title);
    const before = await readFile(join(directory, entries[0]!));
    await provider.search({ ...search, cacheMode: 'live' }); assert.equal(calls, 3);
    assert.deepEqual(await readFile(join(directory, entries[0]!)), before);
    assert.deepEqual(diagnostics.map((x) => x.cache), ['miss', 'hit', 'miss', 'bypassed']);
    const different = { ...search, from: new Date('2026-08-01T00:00:00Z') };
    await provider.search(different); assert.equal(calls, 4); assert.equal((await readdir(directory)).length, 2);
    assert.notEqual(gdeltCacheKey(gdeltRequest(provider.settings, input).toString()), gdeltCacheKey(gdeltRequest(provider.settings, different).toString()));
  }, async () => { calls++; return response(); });
});

test('transient 429 and 5xx retry a bounded number; permanent 4xx does not retry', async () => {
  let calls = 0;
  await boundary(async (provider) => { assert.equal((await provider.search({ ...input, cacheMode: 'live' })).length, 1); assert.equal(calls, 3); },
    async () => { calls++; return calls < 3 ? new Response('temporary', { status: calls === 1 ? 429 : 503, headers: { 'retry-after': '0' } }) : response(); });
  calls = 0;
  await boundary(async (provider) => { await assert.rejects(provider.search(input), /HTTP 400/); assert.equal(calls, 1); },
    async () => { calls++; return new Response('invalid query', { status: 400 }); });
  calls = 0;
  await boundary(async (provider) => { await assert.rejects(provider.search(input), /HTTP 503/); assert.equal(calls, 3); },
    async () => { calls++; return new Response('temporary', { status: 503, headers: { 'retry-after': '0' } }); });
});

test('malformed response is not retried or cached; excessive Retry-After surfaces clearly', async () => {
  let calls = 0;
  await boundary(async (provider, directory) => {
    await assert.rejects(provider.search(input), BadGatewayException); assert.equal(calls, 1); assert.equal((await readdir(directory)).length, 0);
  }, async () => { calls++; return new Response('not JSON'); });
  await boundary(async (provider) => { await assert.rejects(provider.search(input), ServiceUnavailableException); },
    async () => new Response('rate limited', { status: 429, headers: { 'retry-after': '120' } }));
});

test('timeout and connection failure surface distinct errors without retries', async () => {
  let calls = 0;
  await boundary(async (provider) => { await assert.rejects(provider.search(input), GatewayTimeoutException); assert.equal(calls, 1); },
    async (_url, options) => { calls++; return await new Promise<Response>((_resolve, reject) => options!.signal!.addEventListener('abort', () => reject(new Error('aborted')), { once: true })); }, { GDELT_TIMEOUT_MS: 10 });
  await boundary(async (provider) => { await assert.rejects(provider.search(input), ServiceUnavailableException); }, async () => { throw new TypeError('network'); });
});

test('invalid GDELT configuration fails before HTTP', () => {
  for (const settings of [{ GDELT_TIMEOUT_MS: 0 }, { GDELT_MAX_RETRIES: 4 }, { GDELT_REQUEST_DELAY_MS: 'NaN' },
    { GDELT_BASE_URL: 'bad' }, { GDELT_BASE_URL: 'https://x.example/?secret=1' }, { GDELT_CACHE_PATH: ' ' }]) {
    assert.throws(() => new GdeltNewsProvider(new ConfigService(settings)), InternalServerErrorException);
  }
});
