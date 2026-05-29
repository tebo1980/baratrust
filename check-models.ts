// Replace with your actual Gemini API Key
const GEMINI_API_KEY = "AIzaSyAW-_PZ6WRlxQm2EHb74eZjq4AMMVoQeh8";

async function interrogateGoogle() {
    console.log("Pinging Google servers for authorized models...");

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
        const data = await response.json();

        if (data.error) {
            console.error("\n=== GOOGLE REJECTED THE KEY ===");
            console.error(data.error.message);
            return;
        }

        console.log("\n=== AUTHORIZED MODELS FOR YOUR KEY ===");
        // Filter to only show models that support text generation
        const textModels = data.models.filter((m: any) =>
            m.supportedGenerationMethods.includes("generateContent")
        );

        textModels.forEach((m: any) => {
            console.log(`- ${m.name}`);
        });

    } catch (error) {
        console.error("Connection failed:", error);
    }
}

interrogateGoogle();