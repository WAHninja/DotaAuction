// lib/ably.ts
import Ably from "ably/promises";

export const ablyServer = new Ably.Realtime.Promise(process.env.ABLY_API_KEY!);
