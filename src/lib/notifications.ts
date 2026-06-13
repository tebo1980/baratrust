import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio Client (Edge-safe check)
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendTechnicianDispatchSMS({
    toPhone,
    tradeSector,
    urgency,
    location,
    scopeSummary,
    supplierName
}: {
    toPhone: string;
    tradeSector: string;
    urgency: string;
    location: string;
    scopeSummary: string;
    supplierName: string;
}) {
    if (!client) {
        console.warn("[SMS GATEWAY] Twilio credentials missing. Skipping SMS dispatch.");
        return { success: false, error: "Twilio not configured" };
    }

    // Dynamic Blue-Collar Payload String
    const messageBody = `
🚨 [${urgency} ${tradeSector.toUpperCase()} DISPATCH] 🚨

📍 SITE LOCATION:
${location}

🛠️ BRIX SCOPE SUMMARY:
${scopeSummary}

📦 GEMMA LOGISTICS:
Parts secured at ${supplierName}. Ready for pickup.

Reply "EN ROUTE" to acknowledge.
`.trim();

    try {
        const message = await client.messages.create({
            body: messageBody,
            from: fromPhone,
            to: toPhone,
        });
        console.log(`[SMS GATEWAY] Dispatch sent successfully. Message SID: ${message.sid}`);
        return { success: true, sid: message.sid };
    } catch (error) {
        console.error(`[SMS GATEWAY] Failed to send dispatch:`, error);
        return { success: false, error };
    }
}
