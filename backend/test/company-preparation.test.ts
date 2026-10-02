import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BadRequestException } from '@nestjs/common';
import { companyJsonPath, companySourcePath, parseCompanyLine, prepareCompanyFile, prepareCompanyText, serializeCompanies } from '../src/companies/company-preparation';
import { validateCompanySeed } from '../src/companies/company-seed';

test('plain, explicit domain, expanded name and both former-name forms', () => {
  for (const [input, name, domain, aliases, category] of [
    ['ZutaCore', 'ZutaCore', null, [], 'plain'],
    ['Lambda (LAMBDA.AI)', 'Lambda', 'lambda.ai', [], 'domain'],
    ['SSI (Safe Superintelligence)', 'SSI', null, ['Safe Superintelligence'], 'expandedAlias'],
    ['Ludeo (formerly Edge)', 'Ludeo', null, ['Edge'], 'formerAlias'],
    ['Lifeward (formerly known as ReWalk)', 'Lifeward', null, ['ReWalk'], 'formerAlias'],
  ] as const) {
    assert.deepEqual(parseCompanyLine(input), {
      company: { name, rawName: input, domain, aliases, sector: null }, category,
    });
  }
});

test('surrounding whitespace and blank lines are ignored without changing source order', () => {
  const result = prepareCompanyText('\r\n  ZutaCore \r\n\t\r\n SSI (  Safe Superintelligence  ) \r\nLambda ( LAMBDA.AI )\n');
  assert.deepEqual(result.companies.map((company) => company.name), ['ZutaCore', 'SSI', 'Lambda']);
  assert.deepEqual(result.companies[1]?.aliases, ['Safe Superintelligence']);
  assert.equal(result.companies[1]?.rawName, 'SSI (  Safe Superintelligence  )');
  assert.equal(result.companies[2]?.domain, 'lambda.ai');
  assert.equal(prepareCompanyText('\n \t\r\n').companies.length, 0);
});

test('duplicate logical names and domains fail rather than silently dropping lines', () => {
  for (const source of ['ZutaCore\n zutacore ', 'Lambda\nLambda (lambda.ai)',
    'A (same.ai)\nB (SAME.AI)', 'Ludeo (formerly Edge)\nLudeo (Other Name)']) {
    assert.throws(() => prepareCompanyText(source), /duplicates a company name or domain/);
  }
});

test('unsupported or ambiguous parentheticals preserve the full source line', () => {
  for (const rawName of ['A (B) (C)', 'A (B (C))', 'A (B', 'A B)', 'A ()', 'A ( )', '(Alias)',
    'A(Alias)', 'A (B) suffix', 'A (https://a.ai)', 'A (a.ai/path)', 'A (formerly)',
    'A (formerly known as)', 'A (A)', 'A (---)']) {
    assert.deepEqual(parseCompanyLine(` ${rawName} `), {
      company: { name: rawName, rawName, domain: null, aliases: [], sector: null }, category: 'fallback',
    });
  }
  assert.deepEqual(prepareCompanyText('A (B) (C)').fallbackLines, ['A (B) (C)']);
});

test('structured metadata validation trims every string and rejects invalid aliases', () => {
  const row = { name: ' A ', rawName: ' A ( Former ) ', domain: ' A.AI ', aliases: [' Former '], sector: ' Tech ' };
  assert.deepEqual(validateCompanySeed([row]), [{ name: 'A', rawName: 'A ( Former )', domain: 'a.ai', aliases: ['Former'], sector: 'Tech' }]);
  for (const aliases of [null, [''], ['alias', ' ALIAS '], [' a '], [42]]) {
    assert.throws(() => validateCompanySeed([{ ...row, aliases }]), BadRequestException);
  }
});

test('file preparation is deterministic, leaves TXT bytes intact, and validates before output writes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'press-prepare-test-'));
  try {
    const sourcePath = join(directory, 'source.txt');
    const outputPath = join(directory, 'companies.json');
    const source = Buffer.from(' ZutaCore\r\n\r\nLambda (lambda.ai)\r\nSSI (Safe Superintelligence)');
    await writeFile(sourcePath, source);
    const first = await prepareCompanyFile(sourcePath, outputPath);
    const output = await readFile(outputPath);
    await prepareCompanyFile(sourcePath, outputPath);
    assert.deepEqual(await readFile(sourcePath), source);
    assert.deepEqual(await readFile(outputPath), output);
    assert.equal(output.toString(), serializeCompanies(first.companies));
    assert.deepEqual(JSON.parse(output.toString()), first.companies);
    await writeFile(sourcePath, 'Duplicate\nduplicate');
    await assert.rejects(prepareCompanyFile(sourcePath, outputPath), BadRequestException);
    assert.deepEqual(await readFile(outputPath), output);
    await assert.rejects(prepareCompanyFile(sourcePath, sourcePath), /must differ/);
    await assert.rejects(prepareCompanyFile(join(directory, 'missing.txt'), outputPath), /Restore the supplied TXT/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('default paths refer only to the committed backend source files', () => {
  assert.match(companySourcePath, /backend\/src\/data\/ourcrowd_companies\.txt$/);
  assert.match(companyJsonPath, /backend\/src\/data\/companies\.json$/);
});
