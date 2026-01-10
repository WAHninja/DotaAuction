// app/components/AblyTest.tsx
'use client'

import { useEffect, useState } from 'react'
import { getAblyClient } from '@/lib/ably-client'

export default function AblyTest() {
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    const ably = getAblyClient()
    if (!ably) return

    // Use a test channel
    const channel = ably.channels.get('test-channel')

    const handleMessage = (msg: any) => {
      console.log('Received Ably message:', msg)
      setMessages((prev) => [...prev, msg.data])
    }

    channel.subscribe('test-event', handleMessage)
    console.log('Subscribed to test-channel')

    // Send a test message after 2 seconds
    const timer = setTimeout(() => {
      channel.publish('test-event', `Hello from browser at ${new Date().toLocaleTimeString()}`)
      console.log('Sent test message')
    }, 2000)

    // Cleanup
    return () => {
      channel.unsubscribe('test-event', handleMessage)
      clearTimeout(timer)
    }
  }, [])

  return (
    <div className="p-4 border rounded bg-gray-800 text-white">
      <h3 className="font-bold mb-2">Ably Test Messages</h3>
      {messages.length === 0 && <p>No messages yet…</p>}
      <ul>
        {messages.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </div>
  )
}
// app/components/AblyTest.tsx
'use client'

import { useEffect, useState } from 'react'
import { getAblyClient } from '@/lib/ably-client'

export default function AblyTest() {
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    const ably = getAblyClient()
    if (!ably) return

    // Use a test channel
    const channel = ably.channels.get('test-channel')

    const handleMessage = (msg: any) => {
      console.log('Received Ably message:', msg)
      setMessages((prev) => [...prev, msg.data])
    }

    channel.subscribe('test-event', handleMessage)
    console.log('Subscribed to test-channel')

    // Send a test message after 2 seconds
    const timer = setTimeout(() => {
      channel.publish('test-event', `Hello from browser at ${new Date().toLocaleTimeString()}`)
      console.log('Sent test message')
    }, 2000)

    // Cleanup
    return () => {
      channel.unsubscribe('test-event', handleMessage)
      clearTimeout(timer)
    }
  }, [])

  return (
    <div className="p-4 border rounded bg-gray-800 text-white">
      <h3 className="font-bold mb-2">Ably Test Messages</h3>
      {messages.length === 0 && <p>No messages yet…</p>}
      <ul>
        {messages.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </div>
  )
}
