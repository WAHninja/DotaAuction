// app/logout/route.ts
import { destroySession } from '../../../lib/session';

export async function POST() {
  return await destroySession();
}
