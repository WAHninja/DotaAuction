'use client';

import { useEffect } from 'react';
import { loadJitsiScript, getJaasToken } from '@/app/components/ChatWidget';
import { MAIN_ROOM } from '@/app/context/JitsiContext';

/**
 * Zero-UI component. Renders nothing — exists only to pre-warm the Jitsi
 * script and token cache as soon as the dashboard mounts, so that clicking
 * "Join Voice Chat" connects as fast as possible.
 */
export default function JitsiPreloader() {
  useEffect(() => {
    loadJitsiScript().catch(() => {});
    getJaasToken(MAIN_ROOM).catch(() => {});
  }, []);

  return null;
}
