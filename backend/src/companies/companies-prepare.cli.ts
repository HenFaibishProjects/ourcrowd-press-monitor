import { companyJsonPath, prepareCompanyFile } from './company-preparation';

void prepareCompanyFile().then(({ companies, counts, fallbackLines }) => {
  console.info(`Prepared ${companies.length} companies: ${companyJsonPath}`);
  console.info(JSON.stringify(counts));
  for (const line of fallbackLines) console.warn(`Preserved unparsed source line: ${line}`);
}).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Company preparation failed');
  process.exitCode = 1;
});
