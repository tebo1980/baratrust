import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const dbUrlMatch = envFile.match(/DATABASE_URL=(.*)/);
if (!dbUrlMatch) throw new Error('No DATABASE_URL in .env.local');
// Remove any quotes if they exist
const url = dbUrlMatch[1].trim().replace(/^['"]|['"]$/g, '');

const sql = neon(url);

async function run() {
  console.log('Clearing duplicates from leads table...');
  const res = await sql`
    DELETE FROM leads
    WHERE id NOT IN (
        SELECT MIN(id)
        FROM leads
        GROUP BY source
    ) AND source IS NOT NULL;
  `;
  console.log('Duplicates cleared!');
  process.exit(0);
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
