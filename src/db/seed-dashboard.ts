import { db } from "./index";
import { bids, wallets } from "./schema";

const PROJECT_ID = "07284968-a15c-4961-830e-b54e0f7e052c";

async function seedDashboard() {
  console.log(`Seeding dashboard data for project: ${PROJECT_ID}...`);

  try {
    // 1. Insert Bid
    const [newBid] = await db.insert(bids).values({
      projectId: PROJECT_ID,
      status: "presented",
      laborCost: 500000,
      equipmentCost: 800000,
      materialsCost: 200000,
      grantMoneyFound: 200000,
    }).returning();

    console.log(`✅ Successfully created bid: ${newBid.id}`);

    // 2. Insert Wallet
    const [newWallet] = await db.insert(wallets).values({
      projectId: PROJECT_ID,
      bidId: newBid.id,
      status: "captured",
      amountAuthorized: 500000,
      amountCaptured: 500000,
    }).returning();

    console.log(`✅ Successfully created wallet: ${newWallet.id}`);
    console.log("Dashboard seeding complete! Refresh localhost:3000/dashboard to see the metrics.");

  } catch (error) {
    console.error("❌ Error seeding dashboard:", error);
  }
}

seedDashboard();
