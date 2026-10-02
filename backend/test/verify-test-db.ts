import { testDatabaseOptions } from './test-database';

try {
  const options = testDatabaseOptions();
  console.log(`Verified test database isolation. Using database: ${options.database}`);
  process.exit(0);
} catch (error: any) {
  console.error(error.message);
  process.exit(1);
}
