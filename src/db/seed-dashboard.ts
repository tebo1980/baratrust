import { db } from "./index";
import { projects, bids, wallets } from "./schema";

async function seed() {
  console.log("Seeding DashboardMetrics data...");

  // Grab an existing project
  const existingProjects = await db.select().from(projects).limit(1);
  if (existingProjects.length === 0) {
    console.error("No projects found in the database. Cannot seed.");
    process.exit(1);
  }

  const projectId = existingProjects[0].id;
  console.log(`Using project ID: ${projectId}`);

  // Insert bid
  const [newBid] = await db.insert(bids).values({
    projectId: projectId,
    status: 'presented',
    laborCost: 500000,
    equipmentCost: 800000,
    materialsCost: 200000,
    grantMoneyFound: 200000,
  }).returning({ id: bids.id });

  console.log(`Inserted mock bid ID: ${newBid.id}`);

  // Insert wallet
  await db.insert(wallets).values({
    projectId: projectId,
    bidId: newBid.id,
    status: 'captured',
    amountAuthorized: 1500000,
    amountCaptured: 500000,
  });

  console.log("Successfully seeded DashboardMetrics data.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Error seeding data:", err);
  process.exit(1);
});
