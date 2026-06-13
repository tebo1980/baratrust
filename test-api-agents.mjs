async function runTest() {
    console.log("🚀 Querying /api/agents...");
    const res = await fetch("http://localhost:3000/api/agents");
    const data = await res.json();
    console.log("✅ API Response:", JSON.stringify(data, null, 2));
}

runTest().catch(console.error);
