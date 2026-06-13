import fetch from 'node-fetch';

async function testRefuel() {
    console.log("🚀 Firing Auto-Refuel Credit Injection ($100.00)...");
    
    try {
        const res = await fetch("http://localhost:3000/api/wallets/refuel", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ amountCents: 10000 }) // $100.00
        });

        if (!res.ok) {
            console.error("❌ Request failed:", await res.text());
            return;
        }

        const data = await res.json();
        console.log("✅ Success! Transaction Response:");
        console.log(JSON.stringify(data, null, 2));

    } catch (err) {
        console.error("❌ Refuel test failed to execute:", err);
    }
}

testRefuel();
