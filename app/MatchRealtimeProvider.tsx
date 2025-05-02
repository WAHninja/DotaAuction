// app/components/MatchRealtimeProvider.tsx
"use client";
import { useEffect } from "react";
import * as Ably from "ably";

type MatchRealtimeProviderProps = {
  matchId: number;
  onEvent: (event: string, data: any) => void;
};

export function MatchRealtimeProvider({ matchId, onEvent }: MatchRealtimeProviderProps) {
  useEffect(() => {
    const ably = new Ably.Realtime({
      key: process.env.NEXT_PUBLIC_ABLY_PUBLIC_KEY!,
      clientId: `user-${Math.floor(Math.random() * 100000)}`, // optional unique client ID
    });

    const channel = ably.channels.get(`match-${matchId}`);

    channel.subscribe((message) => {
      onEvent(message.name, message.data);
    });

    return () => {
      channel.unsubscribe();
      channel.detach();
      ably.close();
    };
  }, [matchId]);

  return null;
}
