const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Set DIRECT_URL or DATABASE_URL before running this script.');
  process.exit(1);
}

const sqlFiles = ['./scripts/schema.sql'];

async function runSqlFiles() {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected\n');

    for (const sqlFile of sqlFiles) {
      const filePath = path.join(__dirname, sqlFile);
      console.log(`Running: ${sqlFile}`);

      if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}\n`);
        continue;
      }

      const sql = fs.readFileSync(filePath, 'utf-8');

      try {
        await client.query(sql);
        console.log(`${sqlFile} executed successfully\n`);
      } catch (err) {
        console.error(`Error in ${sqlFile}:`);
        console.error(err.message);
        console.error('');
      }
    }

    console.log('All SQL files processed.');
  } catch (err) {
    console.error('Connection error:', err.message);
  } finally {
    await client.end();
  }
}

runSqlFiles();
