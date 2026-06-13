import { neon } from '@neondatabase/serverless';

async function runTest() {
    console.log("🚀 Querying Postgres DB for agent_configs...");

    const sql = neon(process.env.POSTGRES_DATABASE_URL);

    const rows = await sql`SELECT * FROM agent_configs`;
    console.log(rows);
    process.exit(0);
}

runTest().catch(console.error);
