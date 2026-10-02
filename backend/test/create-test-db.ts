import 'dotenv/config';
// @ts-ignore
import { Client } from 'pg';
import { getTestDbName } from './test-database';

async function createTestDb() {
  const host = process.env.TEST_DB_HOST || process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.TEST_DB_PORT || process.env.DB_PORT || '5433', 10);
  const user = process.env.TEST_DB_USERNAME || process.env.DB_USERNAME || 'ourcrowd';
  const password = process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'ourcrowd';
  const database = 'postgres'; // Connect to default database to create the new one

  const client = new Client({ host, port, user, password, database });
  
  try {
    const dbName = getTestDbName();
    await client.connect();
    
    // Check if database exists
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (res.rowCount === 0) {
      console.log(`Creating database ${dbName}...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database ${dbName} created successfully.`);
    } else {
      console.log(`Database ${dbName} already exists.`);
    }
  } catch (err) {
    console.error('Error creating database:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTestDb();
