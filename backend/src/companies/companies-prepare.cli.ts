import { Logger } from '@nestjs/common';
import { companyJsonPath, prepareCompanyFile } from './company-preparation';

const logger = new Logger('CompanyPreparation');
logger.log('Preparing company JSON from the supplied OurCrowd TXT');

void prepareCompanyFile().then(({ companies, counts, fallbackLines }) => {
  logger.log(`Company preparation completed: ${companies.length} companies written to ${companyJsonPath}`);
  logger.log(`Parsed ${counts.plain} plain names, ${counts.domain} domains, ${counts.expandedAlias} expanded aliases, ${counts.formerAlias} former names; ${counts.fallback} preserved unparsed lines`);
  for (const line of fallbackLines) logger.warn(`Preserved unparsed source line: ${line}`);
}).catch((error: unknown) => {
  logger.error(`Company preparation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exitCode = 1;
});
