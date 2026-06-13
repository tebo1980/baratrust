import { neon } from '@neondatabase/serverless';

async function runTest() {
    console.log("🚀 Firing the Multi-Agent Cascade Test...\n");

    const sql = neon(process.env.POSTGRES_DATABASE_URL);

    const payload = {
        title: "Commercial AC Compressor Failure",
        summary: "Server room cooling unit down, temperature rising rapidly. Needs immediate technician deployment and replacement parts.",
        tradeSector: "HVAC",
        prospectContact: "+1-502-555-0144",
        geographicMetadata: "New Albany Industrial Park / Southern Indiana",
        source: "https://neighborhood-alert.test/cascade-test-" + Date.now()
    };

    console.log("[1] Inbound Intercept Triggered!");
    const webhookRes = await fetch("http://localhost:3000/api/webhooks/leads", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + process.env.WEBHOOK_SECRET_KEY
        },
        body: JSON.stringify(payload)
    });

    if (!webhookRes.ok) {
        console.error("Webhook failed:", await webhookRes.text());
        process.exit(1);
    }

    const { leadId } = await webhookRes.json();
    console.log(`[+] Lead successfully ingested with ID: ${leadId}`);
    console.log("[+] Polling for Agent Relay Loop Completion...\n");

    let isComplete = false;
    let attempts = 0;
    while (!isComplete && attempts < 15) {
        await new Promise(r => setTimeout(r, 2000));
        attempts++;
        
        const leads = await sql`SELECT status FROM leads WHERE id = ${leadId}`;
        const currentStatus = leads[0]?.status;
        process.stdout.write(`\r    Polling... Current Status: [${currentStatus}]`);

        if (currentStatus === 'Scheduled Work') {
            isComplete = true;
            console.log("\n\n✅ [CASCADE COMPLETE] Final Master Execution Report:");
            
            const parts = await sql`SELECT * FROM parts_orders WHERE lead_id = ${leadId}`;
            
            console.log(`\n===========================================`);
            console.log(`LEAD STATUS: Scheduled Work`);
            console.log(`\nGEMMA LOGISTICS:`);
            console.log(parts[0]);
            console.log(`===========================================\n`);
            break;
        }
    }

    if (!isComplete) {
        console.error("\n❌ Timeout waiting for cascade to finish.");
        process.exit(1);
    }
}

runTest().catch(console.error);
