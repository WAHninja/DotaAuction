import { NextResponse } from 'next/server'
import { getSession } from '@/app/session'
import db from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ username: null }, { status: 401 })
  }

  const result = await db.query(
    'SELECT username FROM users WHERE id = $1',
    [session.userId]
  )

  const username = result.rows[0]?.username ?? null
  return NextResponse.json({ username })
}
