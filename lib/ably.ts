// lib/ably.ts
import Ably from "ably/promises";

// Check if the API key is provided, and throw an error if not
const ablyApiKey = process.env.ABLY_API_KEY;

if (!ablyApiKey) {
  throw new Error("ABLY_API_KEY environment variable is missing.");
}

export const ablyServer = new Ably.Realtime.Promise(ablyApiKey);
