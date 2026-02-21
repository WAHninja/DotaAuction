// lib/supabase-client.ts
//
// Browser-side Supabase client — used by hooks for Realtime subscriptions.
// Instantiated once and reused across the app.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

if (typeof window !== 'undefined') {
  supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        params: {
          // Identify this client in Supabase's connection logs
          eventsPerSecond: 10,
        },
      },
    }
  );
}

export default supabaseClient;
