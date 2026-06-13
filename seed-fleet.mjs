import { neon } from '@neondatabase/serverless';

async function seedFleet() {
    console.log("🚀 Seeding mock service trucks to fleet_vehicles...");
    const sql = neon(process.env.POSTGRES_DATABASE_URL);

    // Clean existing mock fleet
    await sql`DELETE FROM fleet_vehicles`;

    // Insert mock trucks
    const trucks = [
        { identifier: 'Truck #1 - HVAC Response', tech: 'John Doe', odometer: 42050 },
        { identifier: 'Truck #2 - Electrical/Wiring', tech: 'Sarah Smith', odometer: 81200 },
        { identifier: 'Truck #3 - Plumbing/General', tech: 'Mike Johnson', odometer: 15400 }
    ];

    for (const t of trucks) {
        await sql`INSERT INTO fleet_vehicles (truck_identifier, assigned_technician, current_odometer, status) VALUES (${t.identifier}, ${t.tech}, ${t.odometer}, 'Available')`;
        console.log(`[+] Seeded: ${t.identifier}`);
    }

    console.log("✅ Fleet seeded successfully!");
    process.exit(0);
}

seedFleet().catch(console.error);
