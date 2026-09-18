import fetch from 'node-fetch';

async function run() {
  try {
    const res = await fetch('http://localhost:3000/shield');
    const text = await res.text();
    console.log("STATUS:", res.status);
    console.log("=== HEAD ===");
    console.log(text.substring(0, 1500));
    console.log("=== ERROR TEXT ===");
    const match = text.match(/Error: [^\<]+/g);
    if (match) {
        match.forEach(m => console.log(m));
    }
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}
run();
