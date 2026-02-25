import { NextResponse } from 'next/server'
import { getSession } from '@/app/session'
import db from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const result = await db.query(
    'SELECT id, username FROM users WHERE id = $1',
    [session.userId]
  )

  const user = result.rows[0] ?? null
  return NextResponse.json({ user })
}
