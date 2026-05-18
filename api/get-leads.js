import { Client } from 'pg';

export default async function handler(req, res) {
    // 1. Security Check: Only allow GET requests (fetching data)
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 2. Connect to the BaraTrust Live Database
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // 3. Query the vault for the 50 newest commercial leads
        const result = await client.query(`
            SELECT id, title, price, summary, city, created_at 
            FROM leads 
            ORDER BY created_at DESC 
            LIMIT 50;
        `);

        await client.end();

        // 4. Hand the data cleanly to the Vite frontend
        return res.status(200).json({ leads: result.rows });

    } catch (error) {
        console.error("Database error:", error);
        return res.status(500).json({ error: 'Failed to fetch leads from the cloud.' });
    }
}