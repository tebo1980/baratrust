import { neon } from '@neondatabase/serverless';

// Safe standalone JS import bypassing TS schema constraints
const sql = neon(process.env.DATABASE_URL);

async function seedInventory() {
  console.log("🚀 Seeding internal warehouse inventory...");
  
  const items = [
    { partNumber: 'CAP-DUAL-455', partName: 'Universal Dual Run Capacitor', category: 'HVAC', stockQuantity: 20, reorderThreshold: 5, unitCost: 1500 }, // $15.00
    { partNumber: 'TSTAT-PRO-9000', partName: 'Digital Programmable Thermostat', category: 'HVAC', stockQuantity: 15, reorderThreshold: 3, unitCost: 8500 }, // $85.00
    { partNumber: 'COP-CPL-34', partName: '3/4-Inch Copper Coupling', category: 'Plumbing', stockQuantity: 100, reorderThreshold: 20, unitCost: 250 }, // $2.50
    { partNumber: 'WIRE-NUT-BLU', partName: 'Blue Wire Connectors (100pk)', category: 'Electrical', stockQuantity: 50, reorderThreshold: 10, unitCost: 1200 }, // $12.00
  ];

  for (const item of items) {
    try {
      await sql`
        INSERT INTO warehouse_inventory (part_number, part_name, category, stock_quantity, reorder_threshold, unit_cost)
        VALUES (${item.partNumber}, ${item.partName}, ${item.category}, ${item.stockQuantity}, ${item.reorderThreshold}, ${item.unitCost})
        ON CONFLICT (part_number) DO NOTHING;
      `;
      console.log(`[+] Seeded: ${item.partName} (Qty: ${item.stockQuantity})`);
    } catch (err) {
      console.error(`[!] Failed to seed ${item.partName}:`, err);
    }
  }
  
  console.log("✅ Warehouse inventory seeded successfully!");
}

seedInventory().catch(console.error);
